
document.getElementById("lookupForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const plate = plateInput.value.trim().toUpperCase();
  const state = stateInput.value;

  const vin = prompt("If you know the VIN, enter it here (or click Cancel to continue without):");
  if (vin) {
    try {
      const info = await decodeVIN(vin.trim());
      displayVehicleInfo(info);
    } catch (err) {
      alert("VIN lookup failed—showing placeholder info.");
      displayPlaceholder(plate, state);
    }
  } else {
    displayPlaceholder(plate, state);
  }
});

async function decodeVIN(vin) {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
  const json = await res.json();
  return json.Results[0];
}

function displayVehicleInfo(info) {
  document.getElementById("make").textContent = info.Make || 'N/A';
  document.getElementById("model").textContent = info.Model || 'N/A';
  document.getElementById("year").textContent = info.ModelYear || 'N/A';
  document.getElementById("vehicleImg").src = `https://via.placeholder.com/400?text=${info.Make || ''}`;
  document.getElementById("results").classList.remove("hidden");
}

function displayPlaceholder(plate, state) {
  document.getElementById("make").textContent = 'Unknown';
  document.getElementById("model").textContent = 'Unknown';
  document.getElementById("year").textContent = 'Unknown';
  document.getElementById("vehicleImg").src = 'https://via.placeholder.com/400x200?text=Vehicle+Image';
  document.getElementById("results").classList.remove("hidden");
}
