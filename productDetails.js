// js/productDetails.js - Dynamic product details page with color variants
import { db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { createProductCard } from './productCard.js';

// Track selected color globally
let selectedColor = null;
let selectedSize = null;

function toArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
}

function normalizeProductForCard(raw, id) {
    // Normalize mixed Firestore field names so cards always render reliably.
    return {
        id,
        name: raw.name || raw.Name || 'Untitled',
        imageUrl: raw.imageUrl || raw.imageURL || raw.ImageUrl || raw.ImageURL || '',
        price: raw.price ?? raw.Price ?? 0,
        category: raw.category || raw.Category || 'Uncategorized',
        description: raw.description || raw.Description || ''
    };
}

export async function loadProductDetails() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        document.getElementById('prodetails').innerHTML = '<div class="error">Product not found</div>';
        return;
    }
    
    try {
        const productRef = doc(db, "products", productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
            document.getElementById('prodetails').innerHTML = '<div class="error">Product not found</div>';
            return;
        }
        
        const product = { id: productDoc.id, ...productDoc.data() };
        renderProductPage(product);
        
        // Load similar items (same category)
        await loadSimilarItems(product);
        
        // Load match your style (all other categories)
        await loadMatchYourStyle(product);
        
    } catch (error) {
        console.error("Error loading product:", error);
        document.getElementById('prodetails').innerHTML = '<div class="error">Error loading product: ' + error.message + '</div>';
    }
}

async function loadSimilarItems(currentProduct) {
    const similarContainer = document.getElementById('similar-products-container');
    if (!similarContainer) {
        console.log("similar-products-container not found");
        return;
    }
    
    similarContainer.innerHTML = '<div class="loading">Loading similar items...</div>';
    
    try {
        const category = currentProduct.Category || currentProduct.category;
        console.log("Loading similar items for category:", category);
        
        const productsRef = collection(db, "products");
        // Read once and filter in JS so both `Category` and `category` are supported.
        const snapshot = await getDocs(productsRef);
        
        const similarProducts = [];
        snapshot.forEach(doc => {
            const raw = doc.data();
            const productCategory = raw.Category || raw.category;
            if (doc.id !== currentProduct.id && productCategory === category) {
                similarProducts.push(normalizeProductForCard(raw, doc.id));
            }
        });
        
        console.log(`Found ${similarProducts.length} similar products`);
        
        if (similarProducts.length === 0) {
            similarContainer.innerHTML = '<div class="no-products">No similar products found in this category</div>';
            return;
        }
        
        similarContainer.innerHTML = '';
        similarProducts.slice(0, 4).forEach(product => {
            similarContainer.innerHTML += createProductCard(product);
        });
        
        attachProductCardListeners('#similar-products-container');
        
    } catch (error) {
        console.error("Error loading similar products:", error);
        similarContainer.innerHTML = '<div class="error">Error loading similar products</div>';
    }
}

async function loadMatchYourStyle(currentProduct) {
    const styleContainer = document.getElementById('match-your-style-container');
    if (!styleContainer) {
        console.log("match-your-style-container not found");
        return;
    }
    
    styleContainer.innerHTML = '<div class="loading">Loading recommendations...</div>';
    
    try {
        const currentCategory = currentProduct.Category || currentProduct.category;
        console.log("Loading match your style, excluding category:", currentCategory);
        
        const productsRef = collection(db, "products");
        const snapshot = await getDocs(productsRef);
        
        const otherProducts = [];
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const productCategory = product.Category || product.category;
            // Exclude current product and products from same category
            if (product.id !== currentProduct.id && productCategory !== currentCategory) {
                otherProducts.push(product);
            }
        });
        
        // Shuffle for variety
        const shuffled = [...otherProducts];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const recommendedProducts = shuffled.slice(0, 4);
        
        console.log(`Found ${recommendedProducts.length} products for Match Your Style`);
        
        if (recommendedProducts.length === 0) {
            styleContainer.innerHTML = '<div class="no-products">Check out other categories for more styles!</div>';
            return;
        }
        
        styleContainer.innerHTML = '';
        recommendedProducts.forEach(product => {
            styleContainer.innerHTML += createProductCard(product);
        });
        
        attachProductCardListeners('#match-your-style-container');
        
    } catch (error) {
        console.error("Error loading match your style:", error);
        styleContainer.innerHTML = '<div class="error">Error loading recommendations</div>';
    }
}

function attachProductCardListeners(containerId) {
    document.querySelectorAll(`${containerId} .add-to-cart`).forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const productId = btn.getAttribute('data-id');
            const module = await import('./cart.js');
            module.addToCart(productId, 1);
        });
    });
}

function renderProductPage(product) {
    // Handle both capital and lowercase field names
    const mainImage = product.imageUrl || product.imageURL || product.ImageUrl || product.ImageURL || 'https://via.placeholder.com/400';
    const colorVariants = toArray(
        product.secondaryImage ??
        product.secondaryImages ??
        product.SecondaryImage ??
        product.SecondaryImages
    );
    const productName = product.name || product.Name || 'Product';
    const price = product.Price || product.price || 0;
    const category = product.Category || product.category || 'Product';
    const description = product.Description || product.description || 'No description available';
    const sizes = product.Sizes || product.sizes || ['S', 'M', 'L', 'XL'];
    const inStock = product.InStock || product.inStock || true;
    const rating = product.Rating || product.rating || 0;
    
    // Extract color names from URLs
    const colorNames = extractColorNames(colorVariants);
    
    // Build star rating HTML
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    
    // Build size options HTML
    const sizeOptions = sizes.map(size => `<option value="${size}">${size}</option>`).join('');
    
    // Build color variant thumbnails
    let colorThumbnails = '';
    if (colorVariants.length > 0) {
        colorThumbnails = `
            <div class="color-section">
                <label>Colors:</label>
                <div class="color-variants">
                    ${colorVariants.map((img, index) => `
                        <div class="color-option ${index === 0 ? 'active' : ''}" data-color-index="${index}" data-color-name="${colorNames[index]}">
                            <img src="${img}" class="color-thumb" alt="${colorNames[index]}">
                            <span class="color-name">${colorNames[index]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build thumbnail images HTML
    const thumbnails = colorVariants.length > 0 ? `
        <div class="small-img-group">
            ${colorVariants.map((img, index) => `
                <div class="small-img-col">
                    <img src="${img}" width="100%" class="small-img" data-color-index="${index}" alt="Color ${index + 1}">
                </div>
            `).join('')}
        </div>
    ` : '';
    
    const stockStatus = inStock ? '<span class="in-stock"> In Stock</span>' : '<span class="out-of-stock">✗ Out of Stock</span>';
    
    selectedColor = colorVariants.length > 0 ? colorNames[0] : 'Default';
    
    const html = `
        <div class="single-pro-image">
            <img src="${mainImage}" width="100%" id="MainImg" alt="${productName}">
            ${thumbnails}
        </div>
        <div class="single-pro-details">
            <h6>Home / ${category}</h6>
            <h4>${productName}</h4>
            <div class="rating">
                <span class="stars">${stars}</span>
                <span class="rating-value">(${rating})</span>
            </div>
            <h3>R${price.toFixed(2)}</h3>
            ${stockStatus}
            
            ${colorThumbnails}
            
            <div class="size-section">
                <label for="size-select">Size:</label>
                <select id="size-select">
                    <option value="">Select Size</option>
                    ${sizeOptions}
                </select>
            </div>
            
            <div class="quantity-selector">
                <label>Quantity:</label>
                <input type="number" id="quantity-input" value="1" min="1" max="99">
            </div>
            
            <button class="normal" id="add-to-cart-btn" ${!inStock ? 'disabled' : ''}>${inStock ? 'Add To Cart' : 'Out of Stock'}</button>
            
            <h4>Product Details</h4>
            <span>${description}</span>
        </div>
    `;
    
    const container = document.getElementById('prodetails');
    if (container) {
        container.innerHTML = html;
        setupImageGallery(colorVariants);
        setupColorSelection(colorVariants, colorNames);
        setupAddToCart(product, colorVariants, colorNames);
        setupSizeSelection();
    }
}

function extractColorNames(images) {
    const defaultColors = ['Black', 'White', 'Navy', 'Red', 'Gray', 'Blue', 'Purple', 'Green'];
    const colorNames = [];
    
    images.forEach((img, index) => {
        let colorName = defaultColors[index % defaultColors.length];
        const lowerImg = img.toLowerCase();
        
        if (lowerImg.includes('black')) colorName = 'Black';
        else if (lowerImg.includes('white')) colorName = 'White';
        else if (lowerImg.includes('navy')) colorName = 'Navy';
        else if (lowerImg.includes('red')) colorName = 'Red';
        else if (lowerImg.includes('gray') || lowerImg.includes('grey')) colorName = 'Gray';
        else if (lowerImg.includes('blue')) colorName = 'Blue';
        else if (lowerImg.includes('purple')) colorName = 'Purple';
        else if (lowerImg.includes('green')) colorName = 'Green';
        
        colorNames.push(colorName);
    });
    
    return colorNames;
}

function setupImageGallery(colorVariants) {
    const MainImg = document.getElementById("MainImg");
    const smallImgs = document.getElementsByClassName("small-img");
    
    for (let i = 0; i < smallImgs.length; i++) {
        smallImgs[i].onclick = function() {
            MainImg.src = smallImgs[i].src;
            const colorIndex = this.getAttribute('data-color-index');
            if (colorIndex !== null && colorVariants[colorIndex]) {
                updateSelectedColor(parseInt(colorIndex), smallImgs);
            }
        };
    }
}

function setupColorSelection(colorVariants, colorNames) {
    const colorOptions = document.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const colorIndex = parseInt(option.getAttribute('data-color-index'));
            const colorName = option.getAttribute('data-color-name');
            
            selectedColor = colorName;
            
            colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            const MainImg = document.getElementById("MainImg");
            if (MainImg && colorVariants[colorIndex]) {
                MainImg.src = colorVariants[colorIndex];
            }
            
            const smallImgs = document.getElementsByClassName("small-img");
            for (let i = 0; i < smallImgs.length; i++) {
                if (i === colorIndex) {
                    smallImgs[i].style.border = '2px solid #000';
                    smallImgs[i].style.opacity = '1';
                } else {
                    smallImgs[i].style.border = '1px solid #ddd';
                    smallImgs[i].style.opacity = '0.6';
                }
            }
        });
    });
    
    const firstSmallImg = document.querySelector('.small-img');
    if (firstSmallImg) {
        firstSmallImg.style.border = '2px solid #000';
    }
}

function setupSizeSelection() {
    const sizeSelect = document.getElementById('size-select');
    if (sizeSelect) {
        sizeSelect.addEventListener('change', (e) => {
            selectedSize = e.target.value;
        });
    }
}

function setupAddToCart(product, colorVariants, colorNames) {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn && !addToCartBtn.disabled) {
        addToCartBtn.addEventListener('click', async () => {
            const quantity = parseInt(document.getElementById('quantity-input')?.value || 1);
            const sizeSelect = document.getElementById('size-select');
            selectedSize = sizeSelect?.value || '';
            
            if (!selectedSize) {
                alert('Please select a size');
                return;
            }
            
            let selectedColorImage = product.imageUrl || product.imageURL;
            const activeColorOption = document.querySelector('.color-option.active');
            if (activeColorOption) {
                const colorIndex = parseInt(activeColorOption.getAttribute('data-color-index'));
                if (colorVariants[colorIndex]) {
                    selectedColorImage = colorVariants[colorIndex];
                }
            }
            
            const cartItem = {
                id: product.id,
                name: product.name || product.Name,
                price: product.Price || product.price || 0,
                imageURL: selectedColorImage,
                quantity: quantity,
                selectedSize: selectedSize,
                selectedColor: selectedColor,
                colorImage: selectedColorImage
            };
            
            const event = new CustomEvent('add-to-cart', {
                detail: { product: cartItem, quantity, selectedSize, selectedColor, colorImage: selectedColorImage }
            });
            window.dispatchEvent(event);
        });
    }
}

function updateSelectedColor(colorIndex, smallImgs) {
    for (let i = 0; i < smallImgs.length; i++) {
        if (i === colorIndex) {
            smallImgs[i].style.border = '2px solid #000';
            smallImgs[i].style.opacity = '1';
        } else {
            smallImgs[i].style.border = '1px solid #ddd';
            smallImgs[i].style.opacity = '0.6';
        }
    }
}