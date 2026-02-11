```


// second option with edge caes if is ther no jurisdacation

// You may try to use the following codes below:

// Step 1: Calculate tax before creating the PaymentIntent
async function calculateTaxPreview(req, res) {
  const { items, customer_details } = req.body;

  try {
    // Calculate tax based on user's address
    const calculation = await stripe.tax.calculations.create({
      currency: 'usd',
      line_items: items.map(item => ({
        amount: item.amount,
        reference: item.id,
        tax_code: item.tax_code || 'txcd_99999999',
      })),
      customer_details: {
        address: customer_details.address,
        address_source: 'billing',
      },
    });

    // Return tax preview to display in UI
    res.json({
      subtotal: calculation.amount_subtotal,
      tax: calculation.tax_amount_exclusive,
      total: calculation.amount_total,
      calculationId: calculation.id,
      // Add this flag to indicate if tax will be collected
      taxCollected: calculation.tax_amount_exclusive > 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
Then, process the order with Payment Intent, handling the edge case by:

// Step 2: Create PaymentIntent after user confirms
async function createPaymentWithTax(req, res) {
  const { calculationId, taxCollected } = req.body;

  try {
    // Create PaymentIntent
    const paymentIntentParams = {
      amount: req.body.total, // Amount including tax from previous calculation
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    };

    // Only include tax calculation if tax is being collected
    if (taxCollected) {
      paymentIntentParams.hooks = {
        inputs: {
          tax: {
            calculation: calculationId,
          },
        },
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}



Then, when handling the user interface for this particular scenario, you may implement:

// Client-side code
async function updateTaxPreview() {
  const addressData = {
    line1: document.getElementById('address-line1').value,
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    postal_code: document.getElementById('postal-code').value,
    country: document.getElementById('country').value,
  };

  const response = await fetch('/calculate-tax', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cartItems,
      customer_details: { address: addressData }
    })
  }).then(r => r.json());

  // Update UI with tax information
  document.getElementById('subtotal').innerText = $${ (response.subtotal / 100).toFixed(2) };
  document.getElementById('tax-amount').innerText = $${ (response.tax / 100).toFixed(2) };
  document.getElementById('total-amount').innerText = $${ (response.total / 100).toFixed(2) };

  // Handle edge case with no tax jurisdiction
  if (response.tax === 0) {
    // Option 1: Show a message but allow checkout
    document.getElementById('tax-notice').innerText = 'No tax collected for your location';

    // Option 2: Prevent checkout if your business policy requires it
    // document.getElementById('checkout-button').disabled = true;
    // document.getElementById('tax-error').innerText = 'We cannot process orders in your location';
  }

  // Store for later use
  window.taxCalculation = {
    calculationId: response.calculationId,
    taxCollected: response.taxCollected
  };
}

// When user submits the order

```
