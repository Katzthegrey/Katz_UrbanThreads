// script.js - Clean version with search, filters, and cart functionality
import { db, auth } from './firebase-config.js';
import { 
    collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc,
    query, where
} from "firebase/firestore";
import { 
    onAuthStateChanged, signOut 
} from "firebase/auth";

// ========== GLOBAL VARIABLES ==========
let currentUser = null;
let currentCart = [];
let currentCategory = 'all';
let currentPage = 1;
let currentSearchTerm = '';
let allProductsCache = [];
const itemsPerPage = 8;

// ========== TOAST NOTIFICATION ==========
function showToast(message, type = 'info') {
    const bg = type === 'error'
        ? 'linear-gradient(to right, #b91c1c, #ef4444)'
        : 'linear-gradient(to right, #111827, #374151)';

    if (typeof window.Toastify === 'function') {
        window.Toastify({
            text: message,
            duration: 3000,
            gravity: 'top',
            position: 'right',
            close: true,
            backgroundColor: bg
        }).showToast();
        return;
    }
    console[type === 'error' ? 'error' : 'log'](message);
}

// ========== AUTH STATE MANAGEMENT ==========
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthUI();
    if (user) {
        loadUserCart();
    } else {
        currentCart = [];
        updateCartDisplay();
    }
    updateCartIcon();
});

function updateAuthUI() {
    const loginLink = document.getElementById('login-link');
    const userEmail = document.getElementById('user-email');
    const logoutLink = document.getElementById('logout-link');
    
    if (currentUser) {
        if (loginLink) loginLink.style.display = 'none';
        if (userEmail) {
            userEmail.style.display = 'inline';
            userEmail.textContent = `Hi, ${currentUser.email.split('@')[0]}`;
        }
        if (logoutLink) logoutLink.style.display = 'inline';
    } else {
        if (loginLink) loginLink.style.display = 'inline';
        if (userEmail) userEmail.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
    }
}

window.logout = async function() {
    await signOut(auth);
    window.location.href = 'Home.html';
};

// ========== PRODUCT NORMALIZATION ==========
function normalizeProduct(raw, id) {
    return {
        id: id,
        name: raw.name || 'Untitled',
        category: raw.Category || raw.category || 'Uncategorized',
        description: raw.Description || raw.description || '',
        price: raw.Price || raw.price || 0,
        rating: raw.Rating || raw.rating || 0,
        isFeatured: raw.IsFeatured || raw.isFeatured || false,
        inStock: raw.InStock || raw.inStock || false,
        sizes: raw.Sizes || raw.sizes || [],
        imageUrl: raw.imageUrl || raw.imageURL || '',
        secondaryImage: raw.secondaryImage || raw.secondaryImages || []
    };
}

// ========== PRODUCT LOADING FUNCTIONS ==========

// Load and cache all products
async function loadProductsCache() {
    if (allProductsCache.length === 0) {
        const querySnapshot = await getDocs(collection(db, "products"));
        allProductsCache = [];
        querySnapshot.forEach((productDoc) => {
            allProductsCache.push(normalizeProduct(productDoc.data(), productDoc.id));
        });
    }
    return allProductsCache;
}

// Load featured products for homepage
async function loadFeaturedProducts() {
    const container = document.getElementById('popular-products');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading featured products...</div>';
    
    try {
        const products = await loadProductsCache();
        const featuredProducts = products.filter(p => p.isFeatured);

        if (featuredProducts.length === 0) {
            container.innerHTML = '<div class="no-products">No featured products yet</div>';
            return;
        }
        
        container.innerHTML = '';
        featuredProducts.slice(0, 4).forEach((product) => {
            container.innerHTML += createProductCard(product);
        });
        
        attachProductCardEvents();
    } catch (error) {
        console.error("Error loading featured products:", error);
        container.innerHTML = '<div class="error">Error loading products. Please refresh.</div>';
    }
}

// Load random products for New Arrivals section
async function loadNewArrivals() {
    const container = document.getElementById('new-arrivals');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading new arrivals...</div>';
    
    try {
        const products = await loadProductsCache();
        
        // Shuffle array for random display
        const shuffled = [...products];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const randomProducts = shuffled.slice(0, 4);
        
        if (randomProducts.length === 0) {
            container.innerHTML = '<div class="no-products">No products available</div>';
            return;
        }
        
        container.innerHTML = '';
        randomProducts.forEach((product) => {
            container.innerHTML += createProductCard(product);
        });
        
        attachProductCardEvents();
    } catch (error) {
        console.error("Error loading new arrivals:", error);
        container.innerHTML = '<div class="error">Error loading products. Please refresh.</div>';
    }
}

// Load products for shop page with filters and search
async function loadShopProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading products...</div>';
    
    try {
        const products = await loadProductsCache();
        
        let filteredProducts = [...products];
        
        // Apply category filter
        if (currentCategory !== 'all') {
            filteredProducts = filteredProducts.filter(p => p.category === currentCategory);
        }
        
        // Apply search filter
        if (currentSearchTerm.trim() !== '') {
            const term = currentSearchTerm.toLowerCase().trim();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(term) ||
                p.category.toLowerCase().includes(term) ||
                p.description.toLowerCase().includes(term)
            );
            
            const resultsCount = document.getElementById('search-results-count');
            if (resultsCount) {
                resultsCount.textContent = `Found ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} for "${currentSearchTerm}"`;
            }
        } else {
            const resultsCount = document.getElementById('search-results-count');
            if (resultsCount) resultsCount.textContent = '';
        }

        if (filteredProducts.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="ri-emotion-sad-line"></i>
                    <h3>No products found</h3>
                    <p>We couldn't find any products matching "${currentSearchTerm}"</p>
                    <p>Try different keywords or browse our categories</p>
                </div>
            `;
            return;
        }

        // Paginate
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        
        container.innerHTML = '';
        paginatedProducts.forEach(product => {
            let productHtml = createProductCard(product);
            if (currentSearchTerm) {
                const regex = new RegExp(`(${currentSearchTerm})`, 'gi');
                productHtml = productHtml.replace(regex, '<span class="search-highlight">$1</span>');
            }
            container.innerHTML += productHtml;
        });
        
        updatePagination(filteredProducts.length);
        attachProductCardEvents();
        
    } catch (error) {
        console.error("Error loading products:", error);
        container.innerHTML = '<div class="error">Error loading products. Please refresh.</div>';
    }
}

// Create product card HTML
function createProductCard(product) {
    const imageUrl = product.imageUrl || 'https://via.placeholder.com/300';
    return `
        <div class="pro" data-product-id="${product.id}">
            <img src="${imageUrl}" alt="${product.name}">
            <div class="des">
                <h5>${product.name}</h5>
                <div class="price-category">
                    <span class="price">R${product.price.toFixed(2)}</span>
                    <span class="category-badge">${product.category}</span>
                </div>
                <p class="product-description">${(product.description || '').substring(0, 60)}...</p>
            </div>
            <a href="#" class="add-to-cart" data-id="${product.id}">
                <i class="ri-shopping-cart-2-fill pro-cart"></i>
            </a>
        </div>
    `;
}

// ========== SHOPPING CART FUNCTIONS ==========

async function loadUserCart() {
    if (!currentUser) return;
    
    try {
        const q = query(collection(db, "carts"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        currentCart = [];
        querySnapshot.forEach(doc => {
            currentCart.push({ id: doc.id, ...doc.data() });
        });
        
        updateCartDisplay();
        updateCartIcon();
    } catch (error) {
        console.error("Error loading cart:", error);
    }
}

async function addToCart(productId, quantity = 1, size = null, color = null) {
    if (!currentUser) {
        showToast('Please login to add items to your cart!', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const productRef = doc(db, "products", productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
            showToast('Product not found', 'error');
            return;
        }
        
        const product = normalizeProduct(productDoc.data(), productDoc.id);
        const existingItem = currentCart.find(item => item.productId === productId);
        
        if (existingItem) {
            const cartItemRef = doc(db, "carts", existingItem.id);
            await updateDoc(cartItemRef, { quantity: existingItem.quantity + quantity });
        } else {
            await addDoc(collection(db, "carts"), {
                userId: currentUser.uid,
                productId: productId,
                name: product.name,
                price: product.price,
                imageURL: product.imageUrl,
                quantity: quantity,
                selectedSize: size,
                selectedColor: color,
                addedAt: new Date().toISOString()
            });
        }
        
        await loadUserCart();
        showToast(`${product.name} added to cart!`);
        
    } catch (error) {
        console.error("Error adding to cart:", error);
        showToast('Error adding to cart. Please try again.', 'error');
    }
}

async function removeFromCart(cartItemId) {
    if (!currentUser) return;
    
    try {
        await deleteDoc(doc(db, "carts", cartItemId));
        await loadUserCart();
    } catch (error) {
        console.error("Error removing from cart:", error);
    }
}

function updateCartDisplay() {
    const cartContent = document.getElementById('cart-content');
    const totalPriceEl = document.getElementById('total-price');
    
    if (!cartContent) return;
    
    if (currentCart.length === 0) {
        cartContent.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        if (totalPriceEl) totalPriceEl.textContent = 'R0';
        return;
    }
    
    let total = 0;
    cartContent.innerHTML = currentCart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-box" data-cart-id="${item.id}">
                <img src="${item.imageURL || 'https://via.placeholder.com/100'}" class="cart-img">
                <div class="detail-box">
                    <div class="cart-product-title">${item.name}</div>
                    <div class="cart-color-size">${item.selectedColor ? `Color: ${item.selectedColor}` : ''}${item.selectedSize ? ` | Size: ${item.selectedSize}` : ''}</div>
                    <div class="cart-price">R${item.price.toFixed(2)}</div>
                    <input type="number" value="${item.quantity}" min="1" class="cart-quantity" data-id="${item.id}">
                </div>
                <i class="ri-delete-bin-7-fill cart-remove" data-id="${item.id}"></i>
            </div>
        `;
    }).join('');
    
    if (totalPriceEl) totalPriceEl.textContent = `R${total.toFixed(2)}`;
    
    document.querySelectorAll('.cart-quantity').forEach(input => {
        input.removeEventListener('change', handleQuantityChange);
        input.addEventListener('change', handleQuantityChange);
    });
    
    document.querySelectorAll('.cart-remove').forEach(icon => {
        icon.removeEventListener('click', handleRemoveItem);
        icon.addEventListener('click', handleRemoveItem);
    });
}

function handleQuantityChange(e) {
    updateCartQuantity(e.target.dataset.id, parseInt(e.target.value));
}

function handleRemoveItem(e) {
    removeFromCart(e.target.dataset.id);
}

async function updateCartQuantity(cartItemId, newQuantity) {
    if (!currentUser || newQuantity < 1) return;
    
    try {
        await updateDoc(doc(db, "carts", cartItemId), { quantity: newQuantity });
        await loadUserCart();
    } catch (error) {
        console.error("Error updating quantity:", error);
    }
}

function updateCartIcon() {
    const cartIcon = document.getElementById('cart-icon');
    if (!cartIcon) return;
    
    const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0);
    cartIcon.setAttribute('data-quantity', totalItems);
}

// ========== UI EVENT HANDLERS ==========

function attachProductCardEvents() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.removeEventListener('click', handleAddToCart);
        btn.addEventListener('click', handleAddToCart);
    });
    
    // Product card navigation
    document.querySelectorAll('.pro[data-product-id]').forEach(card => {
        card.style.cursor = 'pointer';
        card.removeEventListener('click', handleProductCardClick);
        card.addEventListener('click', handleProductCardClick);
    });
}

function handleProductCardClick(e) {
    if (e.target.closest('.add-to-cart')) return;
    const productId = e.currentTarget.getAttribute('data-product-id');
    if (productId) window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
}

async function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    const productId = e.currentTarget.getAttribute('data-id');
    await addToCart(productId);
}

function updatePagination(totalItems) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    paginationDiv.style.display = 'block';
    paginationDiv.innerHTML = `
        ${currentPage > 1 ? '<a href="#" id="prev-page">← Prev</a>' : ''}
        <span id="page-info">Page ${currentPage} of ${totalPages}</span>
        ${currentPage < totalPages ? '<a href="#" id="next-page">Next →</a>' : ''}
    `;
    
    if (currentPage > 1) {
        document.getElementById('prev-page')?.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage--;
            loadShopProducts();
        });
    }
    
    if (currentPage < totalPages) {
        document.getElementById('next-page')?.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage++;
            loadShopProducts();
        });
    }
}

// ========== SEARCH FUNCTIONALITY ==========
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    
    if (!searchInput) return;
    
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearchTerm = e.target.value;
            currentPage = 1;
            
            if (searchClear) {
                searchClear.style.display = currentSearchTerm ? 'flex' : 'none';
            }
            
            loadShopProducts();
        }, 300);
    });
    
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            currentSearchTerm = '';
            searchClear.style.display = 'none';
            loadShopProducts();
        });
    }
}

// ========== CATEGORY FILTERS ==========
function setupCategoryFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns.length) return;
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-category');
            currentPage = 1;
            
            // Clear search when changing category
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '';
                currentSearchTerm = '';
                const searchClear = document.getElementById('search-clear');
                if (searchClear) searchClear.style.display = 'none';
            }
            
            loadShopProducts();
        });
    });
}

// ========== UI SETUP ==========
function setupCartUI() {
    const cartIcon = document.getElementById('cart-icon');
    const cart = document.querySelector('.cart');
    const closeCart = document.getElementById('close-cart');
    
    if (cartIcon && cart) cartIcon.onclick = () => cart.classList.add('active');
    if (closeCart && cart) closeCart.onclick = () => cart.classList.remove('active');
}

function setupMobileMenu() {
    const bar = document.getElementById('bar');
    const close = document.getElementById('close');
    const nav = document.getElementById('navbar');
    
    if (bar && nav) bar.addEventListener('click', () => nav.classList.add('active'));
    if (close && nav) close.addEventListener('click', () => nav.classList.remove('active'));
}

// ========== CHECKOUT ==========
window.checkout = async function() {
    if (!currentUser) {
        showToast('Please login to checkout', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    if (currentCart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    // Hand off order completion to checkout page flow.
    window.location.href = 'checkout.html';
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    setupCartUI();
    setupMobileMenu();
    setupCategoryFilters();
    setupSearch();
    
    // Homepage sections
    if (document.getElementById('popular-products')) loadFeaturedProducts();
    if (document.getElementById('new-arrivals')) loadNewArrivals();
    
    // Shop page
    if (document.getElementById('products-container')) loadShopProducts();
    
    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', window.checkout);
    
    // Logout button
    const logoutBtn = document.getElementById('logout-link');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.logout();
        });
    }
});