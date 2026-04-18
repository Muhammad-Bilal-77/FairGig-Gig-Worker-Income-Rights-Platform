async function register() {
  const payload = {
    email: "mb3454545@gmail.com",
    password: "Password1234",
    full_name: "Test Anomaly Worker",
    role: "worker",
    city: "Karachi",
    city_zone: "Korangi",
    worker_category: "food_delivery"
  };

  try {
    const response = await fetch('http://localhost:4001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (response.ok || response.status === 409) {
      console.log('User registered or already exists.');
      process.exit(0);
    } else {
      console.error('Registration failed:', data);
      process.exit(1);
    }
  } catch (err) {
    console.error('Network error:', err);
    process.exit(1);
  }
}

register();
