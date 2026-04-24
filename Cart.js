// js/cart.js - Cart functionality
import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, getDoc } from "firebase/firestore";

let currentUser = null;
let currentCart = [];

export function initCart(authStateHandler) {
    // Auth state handling
    const { onAuthStateChanged } = await import("firebase/auth");
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            await loadUserCart();
        } else {
            currentCart = [];
            updateCartDisplay();
        }
        updateCartIcon();
        if (authStateHandler) authStateHandler(user);
    });
}

export async function loadUserCart() {
    if (!currentUser) return;
    
    try {
        const q = query(collection(db, "carts"), where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        currentCart = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateCartDisplay();
        updateCartIcon();
    } catch (error) {
        console.error("Error loading cart:", error);
    }
}

export async function addToCart(productId, quantity, selectedSize = null, selectedColor = null, colorImage = null) {
    if (!currentUser) {
        alert('Please login to add items to your cart!');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const productRef = doc(db, "products", productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
            alert('Product not found');
            return;
        }
        
        const product = { id: productDoc.id, ...productDoc.data() };
        const price = product.Price || product.price || 0;
        const name = product.name;
        const imageToUse = colorImage || product.imageUrl || product.imageURL;
        
        // Create cart item with color and size
        const cartItem = {
            userId: currentUser.uid,
            productId: productId,
            name: name,
            price: price,
            imageURL: imageToUse,
            quantity: quantity,
            selectedSize: selectedSize || 'N/A',
            selectedColor: selectedColor || 'Default',
            addedAt: new Date().toISOString()
        };
        
        // Check if item with same productId, size, and color already exists
        const existingItem = currentCart.find(item => 
            item.productId === productId && 
            item.selectedSize === selectedSize && 
            item.selectedColor === selectedColor
        );
        
        if (existingItem) {
            await updateDoc(doc(db, "carts", existingItem.id), {
                quantity: existingItem.quantity + quantity
            });
        } else {
            await addDoc(collection(db, "carts"), cartItem);
        }
        
        await loadUserCart();
        alert(`${name} (${selectedColor}, ${selectedSize}) added to cart!`);
    } catch (error) {
        console.error("Error adding to cart:", error);
        alert('Error adding to cart. Please try again.');
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
                    <div class="cart-color-size">
                        Color: ${item.selectedColor || 'Default'} | Size: ${item.selectedSize || 'N/A'}
                    </div>
                    <div class="cart-price">R${item.price.toFixed(2)}</div>
                    <input type="number" value="${item.quantity}" min="1" class="cart-quantity" data-id="${item.id}">
                </div>
                <i class="ri-delete-bin-7-fill cart-remove" data-id="${item.id}"></i>
            </div>
        `;
    }).join('');
    
    if (totalPriceEl) totalPriceEl.textContent = `R${total.toFixed(2)}`;
    
    // Attach event listeners
    document.querySelectorAll('.cart-quantity').forEach(input => {
        input.addEventListener('change', (e) => updateCartQuantity(e.target.dataset.id, parseInt(e.target.value)));
    });
    document.querySelectorAll('.cart-remove').forEach(icon => {
        icon.addEventListener('click', (e) => removeFromCart(e.target.dataset.id));
    });
}
function updateCartIcon() {
    const cartIcon = document.getElementById('cart-icon');
    if (!cartIcon) return;
    const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0);
    cartIcon.setAttribute('data-quantity', totalItems);
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

async function removeFromCart(cartItemId) {
    if (!currentUser) return;
    try {
        await deleteDoc(doc(db, "carts", cartItemId));
        await loadUserCart();
    } catch (error) {
        console.error("Error removing from cart:", error);
    }
}