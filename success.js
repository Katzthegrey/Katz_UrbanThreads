document.addEventListener('DOMContentLoaded', () => {
    const cartIcon = document.getElementById('cart-icon');
    const bar = document.getElementById('bar');
    const nav = document.getElementById('navbar');

    if (cartIcon) {
        cartIcon.setAttribute('data-quantity', '0');
    }

    if (bar && nav) {
        bar.addEventListener('click', () => nav.classList.add('active'));
    }
});
