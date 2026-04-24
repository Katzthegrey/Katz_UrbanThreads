# Urban Threads Ecommerce - User Guide & Documentation

## Welcome to Urban Threads

Let me walk you through how my ecommerce platform works and how you can use it. Urban Threads is a fully functional online clothing store that I built with Firebase handling all the backend services. Everything loads dynamically from the database, so there's no hardcoded content anywhere.

---

## How the App Works

### The Core Technology

I built this entire application using plain HTML, CSS, and JavaScript with ES modules. Firebase provides the database, authentication, and storage services. When you visit any page, my JavaScript code talks directly to Firebase to fetch products, manage your cart, and process orders.

The key difference from static websites is that I never hardcode product information. Instead, every product card, every price, every image, and every description comes directly from the Firestore database. This means I can update products anytime without touching the code.

### User Journeys

There are three main paths you can take through my application.

**Browsing Products** starts on the home page or shop page. When you land on either page, JavaScript automatically fetches all products from Firestore and renders them as attractive product cards. On the home page, you'll see featured products highlighted and a random selection of new arrivals. The shop page gives you full control with category filters, a search bar, and pagination for easy browsing.

**Viewing Product Details** happens when you click on any product card. This takes you to a dedicated product page that loads information for just that item. You'll see multiple color options if available, size selections, a quantity picker, and detailed descriptions. I also built recommendation sections that show you similar products from the same category and a "Match Your Style" section featuring items from other categories.

**Completing a Purchase** requires you to be logged in. When you add items to your cart, they save to Firestore under your user account. Clicking the checkout button takes you through a form where you provide shipping information and select a payment method. After validation, the system creates an order record, clears your cart, and shows you a success confirmation.

---

## How to Use the Application

### Getting Started

First, make sure you serve the application through a local HTTP server. You cannot simply open the HTML files directly in your browser because ES modules require proper CORS handling. I recommend using VS Code Live Server, running Python's HTTP server, or any static server you prefer.

Once served, open your browser and navigate to Home.html. You'll see the Urban Threads storefront with featured products already loading.

### Browsing Without an Account

You can browse all products without logging in. Visit the shop page to see everything available. Use the category filter buttons at the top to narrow down by product type like Hoodies, Caps, Jeans, or Accessories. The search bar lets you find specific products by name, category, or description keywords. Type in anything and the results update in real-time with highlighted matches.

If you try to add an item to your cart without logging in, the system will prompt you to sign up or log in first. This ensures your cart saves to your account.

### Creating an Account

Click the Login link in the navigation bar to reach the authentication page. You'll see two forms - one for signing in and one for creating a new account. To register, provide a username, email address, and password. Make sure your password has at least six characters.

After successful registration, the system creates your user account in Firebase Auth and stores your username in Firestore. You'll automatically redirect to the home page logged in.

### Shopping Experience

Once logged in, adding items to your cart becomes easy. Click the shopping cart icon on any product card, or use the Add to Cart button on product detail pages. For variable items, select a size and color first - the system won't let you add without these selections.

Your cart icon displays a numbered badge showing how many items you have. Click the cart icon anytime to open the sidebar and review your selections. From there, you can update quantities, remove items, or proceed to checkout.

### Managing Your Cart

The cart sidebar shows each item with its image, name, selected color and size, individual price, and quantity. You can change quantities directly in the sidebar, and the total updates automatically. Click the trash icon to remove any item. All changes save immediately to Firestore, so your cart persists even if you close the browser and come back later.

### Checking Out

When you're ready to purchase, click the Checkout button in the cart sidebar. This takes you to the checkout page, but only if you're logged in and your cart isn't empty.

The checkout page displays your order summary on the left with itemized products, quantities, and prices. It calculates subtotal, adds a shipping fee, computes fifteen percent tax, and shows your final total.

On the right side, fill out the shipping information form with your first name, last name, email, phone number, street address, city, postal code, and country. All fields are required.

Select your payment method from Credit Card, PayPal, or Cash on Delivery. If you choose credit card, additional fields appear for card number, expiry date, and CVV. The card number field automatically formats with spaces every four digits, and the expiry field adds the slash automatically.

Click Place Order to submit. The system validates all fields and creates an order document in Firestore containing your customer information, cart items, and payment method. It then deletes your cart items and redirects you to the success page.

### After Purchase

The success page confirms your order and provides estimated delivery information. You'll receive order confirmation via email, and tracking details will follow by SMS. From here, you can continue shopping or return to the home page.

---

## Understanding the Database Structure

### Products Collection

Each product in my database contains specific fields that the frontend expects:

| Field | Type | Description |
|-------|------|-------------|
| name | string | Product title |
| category | string | Hoodies, Caps, Jeans, Shorts, T-shirts, Sneakers, Accessories |
| description | string | Detailed product information |
| price | number | Product cost |
| rating | number | Average customer rating (0-5) |
| isFeatured | boolean | Appears on home page featured section |
| inStock | boolean | Availability status |
| sizes | array | Available sizes like S, M, L, XL |
| colors | array | Available color options |
| imageUrl | string | Main product image URL |
| secondaryImage | array | Additional images for color variants |

### Carts Collection

When you add items to your cart, the system creates documents with:

| Field | Description |
|-------|-------------|
| userId | Your account identifier |
| productId | Reference to the original product |
| name | Product name (denormalized for cart display) |
| price | Product price (denormalized) |
| imageURL | Product image (denormalized) |
| quantity | Number of items |
| selectedSize | Your size choice |
| selectedColor | Your color choice |
| addedAt | Timestamp of when you added the item |

### Orders Collection

When you complete checkout, the system creates an order document containing:

| Field | Description |
|-------|-------------|
| userId | Your account identifier |
| userEmail | Your email address |
| customerInfo | Nested object with all shipping details |
| paymentMethod | Credit Card, PayPal, or Cash on Delivery |
| items | Complete cart snapshot at checkout |
| subtotal | Item total before fees |
| shipping | Delivery fee |
| tax | 15% tax calculation |
| total | Final amount charged |
| status | Order progress (completed, pending, shipped) |
| orderDate | When you placed the order |

---

### Setting Featured Products

To make a product appear on the home page featured section, ensure its `isFeatured` field is set to `true`. You can do this in the admin bulk manager by checking the Featured checkbox for any product.

### Managing Inventory

The `inStock` field controls whether a product shows as available. When `false`, the Add to Cart button disables and an "Out of Stock" badge appears. Update this in the admin panel as inventory changes.


