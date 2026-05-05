# k-flow-card
Animated energy flow card for Home Assistant – monitor solar, battery, grid and home consumption in real time.
<img width="888" height="1328" alt="IMG_20260505_134007" src="https://github.com/user-attachments/assets/66294483-7945-4fd4-bd24-75d429caffb8" />
<img width="892" height="1328" alt="IMG_20260505_133935" src="https://github.com/user-attachments/assets/f0fee0af-d92e-4061-8815-ef8839b5eb03" />
<img width="866" height="1334" alt="IMG_20260505_133836" src="https://github.com/user-attachments/assets/61db504f-f518-4bfe-8e13-400c7dc2ce15" />
<img width="1088" height="1946" alt="IMG_20260505_134035" src="https://github.com/user-attachments/assets/0751b9d7-a3ca-47b9-ad48-114395182e45" 


updates are coming soon.  current version kc.0.01.
# ⚡ K‑Flow Card for Home Assistant

A real‑time, animated energy flow dashboard card – monitor solar, battery, grid, and home consumption with a sleek SVG diagram.

![Screenshot](screenshot.png)

## ✨ Features

- **Real‑time updates** via `hass.states` – no long‑lived token needed
- **Animated sun arc** with dynamic sky colours and moon (day/night cycle)
- **Variable‑speed flow lines** (Grid, Battery, Home) – faster animation when power is high
- **Battery fill** with colour‑coded SOC (red → orange → green → cyan)
- **PV block bar** and **Power bar** with correct colour logic
- **GoodWe inverter summary** + temperature / cell data
- **Fully configurable** – every entity ID can be changed in the YAML editor

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
2. Paste: `https://github.com/thekhan1122/k-flow-card`
3. Category: **Lovelace**
4. Install the card – the resource is added automatically.

## ⚙️ Card Configuration

Add a **Manual** card with this YAML (edit the entity IDs to match your system):

```yaml
type: custom:k-flow-card
pv1_power: sensor.goodwe_pv1_power
pv2_power: sensor.goodwe_pv2_power
pv_total_power: sensor.goodwe_pv_power
grid_active_power: sensor.goodwe_active_power
grid_import_energy: sensor.goodwe_today_energy_import
consump: sensor.goodwe_house_consumption
today_pv: sensor.goodwe_today_s_pv_generation
today_batt_chg: sensor.goodwe_today_battery_charge
today_load: sensor.goodwe_today_load
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
