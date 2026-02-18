window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const medName = params.get('med') || 'Unknown Item';
    const price = parseFloat(params.get('price')) || 0;
    const pharmacyName = params.get('pharmacy') || 'Unknown Pharmacy';
    const stock = parseInt(params.get('stock')) || 1;

    const summaryEl = document.getElementById('order-summary');
    const payBtn = document.getElementById('pay-btn');
    const paymentForm = document.getElementById('payment-form');
    const successMsg = document.getElementById('success-message');
    const successDetails = document.getElementById('success-details');

    // Tab elements
    const cardTabBtn = document.getElementById('card-tab-btn');
    const upiTabBtn = document.getElementById('upi-tab-btn');
    const codTabBtn = document.getElementById('cod-tab-btn'); // NEW
    const cardTab = document.getElementById('card-payment-tab');
    const upiTab = document.getElementById('upi-payment-tab');
    const codTab = document.getElementById('cod-payment-tab'); // NEW

    // Build quantity options
    let qtyOptions = '';
    const maxQty = Math.min(stock, 10); // Allow buying max 10 or stock, whichever is lower
    for (let i = 1; i <= maxQty; i++) {
        qtyOptions += `<option value="${i}">${i}</option>`;
    }

    // Populate summary
    summaryEl.innerHTML = `
        <p class="flex justify-between"><strong>Pharmacy:</strong> <span>${pharmacyName}</span></p>
        <p class="flex justify-between"><strong>Medicine:</strong> <span>${medName}</span></p>
        <p class="flex justify-between"><strong>Price per unit:</strong> <span>₹${price.toFixed(2)}</span></p>
        <div class="flex justify-between items-center mt-2 pt-2 border-t">
            <label for="quantity" class="font-medium"><strong>Quantity:</strong></label>
            <select id="quantity" class="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                ${qtyOptions}
            </select>
        </div>
        <h4 id="total-price" class="text-lg font-bold text-right mt-2">Total: ₹${price.toFixed(2)}</h4>
    `;

    const quantityEl = document.getElementById('quantity');
    const totalEl = document.getElementById('total-price');

    // Update total on quantity change
    quantityEl.addEventListener('change', () => {
        const newQty = parseInt(quantityEl.value);
        const newTotal = newQty * price;
        totalEl.textContent = `Total: ₹${newTotal.toFixed(2)}`;
    });

    // Handle Tab Switching
    cardTabBtn.addEventListener('click', () => {
        // Show Card
        cardTabBtn.classList.add('active');
        cardTab.classList.remove('hidden');
        // Hide Others
        upiTabBtn.classList.remove('active');
        codTabBtn.classList.remove('active');
        upiTab.classList.add('hidden');
        codTab.classList.add('hidden');
        // Update button text
        payBtn.innerHTML = 'Pay Now';
        payBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        payBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    });

    upiTabBtn.addEventListener('click', () => {
        // Show UPI
        upiTabBtn.classList.add('active');
        upiTab.classList.remove('hidden');
        // Hide Others
        cardTabBtn.classList.remove('active');
        codTabBtn.classList.remove('active');
        cardTab.classList.add('hidden');
        codTab.classList.add('hidden');
        // Update button text
        payBtn.innerHTML = 'Pay Now';
        payBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        payBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    });

    // NEW: Handle COD Tab
    codTabBtn.addEventListener('click', () => {
        // Show COD
        codTabBtn.classList.add('active');
        codTab.classList.remove('hidden');
        // Hide Others
        cardTabBtn.classList.remove('active');
        upiTabBtn.classList.remove('active');
        cardTab.classList.add('hidden');
        upiTab.classList.add('hidden');
        // Update button text
        payBtn.innerHTML = 'Confirm Order (COD)';
        payBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        payBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    });


    // Handle dummy payment
    payBtn.addEventListener('click', (e) => {
        e.preventDefault();
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        setTimeout(() => {
            // Determine active payment method
            let method = "Card";
            if (upiTabBtn.classList.contains('active')) method = "UPI";
            if (codTabBtn.classList.contains('active')) method = "Cash on Delivery (COD)";

            // Hide the ENTIRE payment card container
            // The payment card is the parent of the payment form. 
            // Better to find it by structure or add an ID, but for now we find it relative to form.
            const paymentCard = paymentForm.closest('.bg-white');
            if (paymentCard) paymentCard.classList.add('hidden');

            const qty = quantityEl.value;
            const total = (qty * price).toFixed(2);

            // Disable quantity selector
            quantityEl.disabled = true;
            quantityEl.classList.add('bg-gray-100', 'cursor-not-allowed');

            // Customize success message
            let successText = `Your order for <strong>${qty} x ${medName}</strong> (Total: ₹${total}) from <strong>${pharmacyName}</strong> is confirmed.`;

            if (method.includes("COD")) {
                successDetails.innerHTML = `${successText} <br>Please pay ₹${total} upon delivery.`;
            } else {
                successDetails.innerHTML = `${successText} <br><div class="mt-3 inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold"><i class="fas fa-receipt mr-2"></i>Paid via ${method}</div>`;
            }

            successMsg.classList.remove('hidden');
            // Scroll to success message
            successMsg.scrollIntoView({ behavior: 'smooth' });

        }, 1500); // Simulate payment delay
    });
};
