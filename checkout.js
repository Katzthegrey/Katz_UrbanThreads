import { db, auth } from './firebase-config.js';
import { collection, getDocs, deleteDoc, doc, addDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

let currentUser = null;
let currentCart = [];

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

function updateAuthUI() {
    const loginLink = document.getElementById('login-link');
    const userEmail = document.getElementById('user-email');
    const logoutLink = document.getElementById('logout-link');

    if (currentUser) {
        if (loginLink) loginLink.style.display = 'none';
        if (userEmail) {
            userEmail.style.display = 'inline';
            userEmail.textContent = `Hi, ${currentUser.email.split('@')[0]}`;
            const emailField = document.getElementById('email');
            if (emailField) emailField.value = currentUser.email;
        }
        if (logoutLink) logoutLink.style.display = 'inline';
    } else {
        if (loginLink) loginLink.style.display = 'inline';
        if (userEmail) userEmail.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
    }
}

async function loadCartAndDisplay() {
    try {
        const q = query(collection(db, "carts"), where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        currentCart = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
        displayOrderSummary();
        updateCartIcon();
    } catch (error) {
        console.error("Error loading cart:", error);
        document.getElementById('order-items').innerHTML = '<div class="error">Error loading cart</div>';
    }
}

function displayOrderSummary() {
    const orderItemsDiv = document.getElementById('order-items');
    const placeOrderBtn = document.getElementById('place-order-btn');

    if (currentCart.length === 0) {
        orderItemsDiv.innerHTML = '<div class="empty-cart">Your cart is empty. <a href="Shop.html">Continue Shopping</a></div>';
        if (placeOrderBtn) placeOrderBtn.disabled = true;
        return;
    }

    let subtotal = 0;
    orderItemsDiv.innerHTML = currentCart.map((item) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="order-item">
                <img src="${item.imageURL || 'https://via.placeholder.com/60'}" alt="${item.name}">
                <div class="order-item-details">
                    <h4>${item.name}</h4>
                    <p>Color: ${item.selectedColor || 'Default'} | Size: ${item.selectedSize || 'N/A'}</p>
                    <div class="order-item-price">
                        <span>Qty: ${item.quantity}</span>
                        <span>R${item.price.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const shipping = 50;
    const tax = subtotal * 0.15;
    const total = subtotal + shipping + tax;

    document.getElementById('subtotal').textContent = `R${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `R${tax.toFixed(2)}`;
    document.getElementById('checkout-total').textContent = `R${total.toFixed(2)}`;
}

function updateCartIcon() {
    const cartIcon = document.getElementById('cart-icon');
    if (!cartIcon) return;
    const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0);
    cartIcon.setAttribute('data-quantity', totalItems);
}

function setupPaymentFields() {
    const cardDetailsDiv = document.getElementById('card-details');
    document.querySelectorAll('input[name="payment"]').forEach((radio) => {
        radio.addEventListener('change', (e) => {
            cardDetailsDiv.style.display = e.target.value === 'credit-card' ? 'block' : 'none';
        });
    });

    document.getElementById('cardNumber')?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '');
        if (value.length > 16) value = value.slice(0, 16);
        value = value.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = value;
    });

    document.getElementById('expiry')?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\//g, '');
        if (value.length > 4) value = value.slice(0, 4);
        if (value.length >= 3) value = value.slice(0, 2) + '/' + value.slice(2);
        e.target.value = value;
    });
}

function setupCartUI() {
    const cartIcon = document.getElementById('cart-icon');
    const cart = document.querySelector('.cart');
    const closeCart = document.getElementById('close-cart');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (cartIcon && cart) cartIcon.onclick = () => cart.classList.add('active');
    if (closeCart && cart) closeCart.onclick = () => cart.classList.remove('active');
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });
}

function setupMobileMenu() {
    const bar = document.getElementById('bar');
    const close = document.getElementById('close');
    const nav = document.getElementById('navbar');

    if (bar && nav) bar.addEventListener('click', () => nav.classList.add('active'));
    if (close && nav) close.addEventListener('click', () => nav.classList.remove('active'));
}

function setupCheckoutForm() {
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtn = document.getElementById('place-order-btn');

    checkoutForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (currentCart.length === 0) {
            showToast('Your cart is empty!', 'error');
            return;
        }

        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode', 'country'];
        for (const field of requiredFields) {
            if (!document.getElementById(field).value) {
                showToast(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'error');
                return;
            }
        }

        const selectedPayment = document.querySelector('input[name="payment"]:checked').value;
        if (selectedPayment === 'credit-card') {
            const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
            const expiry = document.getElementById('expiry').value;
            const cvv = document.getElementById('cvv').value;

            if (cardNumber.length !== 16) return showToast('Please enter a valid 16-digit card number', 'error');
            if (!expiry.match(/^\d{2}\/\d{2}$/)) return showToast('Please enter valid expiry date (MM/YY)', 'error');
            if (cvv.length < 3) return showToast('Please enter valid CVV', 'error');
        }

        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<i class="ri-loader-4-line"></i> Processing...';

        setTimeout(async () => {
            try {
                const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const shipping = 50;
                const tax = subtotal * 0.15;
                const total = subtotal + shipping + tax;

                const orderData = {
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    customerInfo: {
                        firstName: document.getElementById('firstName').value,
                        lastName: document.getElementById('lastName').value,
                        email: document.getElementById('email').value,
                        phone: document.getElementById('phone').value,
                        address: document.getElementById('address').value,
                        city: document.getElementById('city').value,
                        postalCode: document.getElementById('postalCode').value,
                        country: document.getElementById('country').value
                    },
                    paymentMethod: selectedPayment,
                    items: currentCart.map((item) => ({
                        productId: item.productId,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        selectedSize: item.selectedSize,
                        selectedColor: item.selectedColor,
                        imageURL: item.imageURL
                    })),
                    subtotal,
                    shipping,
                    tax,
                    total,
                    status: 'completed',
                    orderDate: new Date().toISOString()
                };

                await addDoc(collection(db, "orders"), orderData);
                for (const item of currentCart) {
                    await deleteDoc(doc(db, "carts", item.id));
                }

                window.location.href = 'Success.html';
            } catch (error) {
                console.error("Error creating order:", error);
                showToast('Error processing order. Please try again.', 'error');
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = '<i class="ri-lock-line"></i> Place Order';
            }
        }, 1200);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupCartUI();
    setupMobileMenu();
    setupPaymentFields();
    setupCheckoutForm();

    document.getElementById('logout-link')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut(auth);
        window.location.href = 'Home.html';
    });
});

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthUI();
    if (user) {
        loadCartAndDisplay();
    } else {
        window.location.href = 'login.html';
    }
});
