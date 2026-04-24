// js/productCard.js - Reusable product card component
export function createProductCard(product) {
    const imageUrl = product.imageUrl || 'https://via.placeholder.com/300';
    
    return `
        <div class="pro" data-product-id="${product.id}">
            <img src="${imageUrl}" alt="${product.name}">
            <div class="des">
                <h5>${product.name}</h5>
                <div class="price-category">
                    <span class="price">R${(product.Price || product.price || 0).toFixed(2)}</span>
                    <span class="category-badge">${product.Category || product.category || 'Uncategorized'}</span>
                </div>
                <p class="product-description">${(product.Description || product.description || '').substring(0, 60)}...</p>
            </div>
            <a href="product.html?id=${product.id}" class="view-product">
                <i class="ri-eye-line"></i>
            </a>
            <a href="#" class="add-to-cart" data-id="${product.id}">
                <i class="ri-shopping-cart-2-fill pro-cart"></i>
            </a>
        </div>
    `;
}

export function renderProducts(containerId, products, attachCartHandler = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="no-products">No products found</div>';
        return;
    }
    
    container.innerHTML = '';
    products.forEach(product => {
        container.innerHTML += createProductCard(product);
    });
    
    if (attachCartHandler) {
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', attachCartHandler);
        });
    }
}