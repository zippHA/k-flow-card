# ⚡ K‑Flow Card for Home Assistant version 1.0.5

A real‑time, animated energy flow dashboard card – monitor solar, battery, grid, and home consumption with a sleek SVG diagram.

<img width="1132" height="1603" alt="Screenshot_2026-05-05-19-02-17-29_cbf47468f7ecfbd8ebcc46bf9cc626da" src="https://github.com/user-attachments/assets/90b301cb-ae96-444e-a161-87cc83982be3" />

<img width="1130" height="1610" alt="Screenshot_2026-05-05-19-06-37-85_cbf47468f7ecfbd8ebcc46bf9cc626da" src="https://github.com/user-attachments/assets/908209a4-b845-42a9-a5ef-ded329020fe3" />


## ✨ Features

- **Real‑time updates** via `hass.states` – no long‑lived token needed
- **Animated sun arc** with dynamic sky colours and moon (day/night cycle)
- **Variable‑speed flow lines** (Grid, Battery, Home) – speed changes with power
- **Battery fill** with colour‑coded SOC (red → orange → green → cyan)
- **PV block bar** and **Power bar** with correct colour logic
- **GoodWe inverter summary** + temperature / cell data
- **Custom PNG icons** for Grid and Home (you can replace them)
- **Fully configurable** – every entity ID can be changed in the YAML editor


🧩 Supported Entities
Any numeric sensor works. The card uses fallbacks (e.g., GoodWe SOC if BMS SOC unavailable).

🎨 Custom Icons
Replace the Grid and Home icons by placing your own PNG files in /config/www/:

Grid icon: grid-icon.png

Home icon: home-icon.png

You can adjust their size and position by editing the corresponding <image> tags inside the card’s JavaScript (lines ~570 and ~580).

🐞 Troubleshooting
Symptom	Solution
"Custom element doesn't exist"	Check resource URL (/local/k-flow-card.js) and type (JavaScript Module).
All values show “--” or NaN	Verify that the sensor IDs exist and return numeric values.
Animations not playing	Ensure the browser tab is active; some browsers pause SVG animations in background tabs.
Icons not showing	Make sure grid-icon.png and home-icon.png exist in /config/www/.

## 🛠 Installation

### Manual
1. Download `k-flow-card.js`
2. Place it in your `config/www` folder
3. Add it as a **module** resource:
   - **Settings → Dashboards → ⋮ → Resources → + Add Resource**
   - URL: `/local/k-flow-card.js`
   - Type: **JavaScript Module**
4. Refresh your dashboard (F5 / Ctrl+Shift+R)

### HACS (custom repository)
1. In HACS, go to **Integrations → ⋮ → Custom repositories**
2. Paste: `https://github.com/thekhan1122/ha-k-flow-card`
3. Category: **Lovelace**
4. Install the card – the resource is added automatically.

## ⚙️ Card Configuration

Add a **Manual** card with the YAML below (edit the entity IDs to match your system):

```yaml
type: custom:k-flow-card
# Solar / Inverter
pv1_power: sensor.goodwe_pv1_power
pv2_power: sensor.goodwe_pv2_power
pv_total_power: sensor.goodwe_pv_power
grid_active_power: sensor.goodwe_active_power
grid_import_energy: sensor.goodwe_today_energy_import
consump: sensor.goodwe_house_consumption
today_pv: sensor.goodwe_today_s_pv_generation
today_batt_chg: sensor.goodwe_today_battery_charge
today_load: sensor.goodwe_today_load

# Battery (JK‑BMS / GoodWe fallbacks)
battery_soc: sensor.jk_soc
battery_power: sensor.jk_power
battery_current: sensor.jk_current
battery_voltage: sensor.jk_voltage
battery_temp1: sensor.jk_temp1
battery_temp2: sensor.jk_temp2
battery_mos: sensor.jk_mos
battery_min_cell: sensor.jk_cellmin
battery_max_cell: sensor.jk_cellmax
battery_rem_cap: sensor.jk_remain
goodwe_battery_soc: sensor.goodwe_battery_state_of_charge
goodwe_battery_curr: sensor.goodwe_battery_current
inv_temp: sensor.goodwe_inverter_temperature_module
batt_dis: sensor.goodwe_today_battery_discharge

# Optional: alternate grid sensor
# grid_power_alt: sensor.grid_phase_a_power
