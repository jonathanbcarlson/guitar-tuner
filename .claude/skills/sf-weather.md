# SF Microclimates Skill

Get hyperlocal SF weather data.

## Triggers

- "weather in [neighborhood]"
- "sf weather mission vs sunset"
- "is it foggy in the richmond?"

## Instructions

When the user asks about San Francisco weather for a specific neighborhood, fetch the weather data using:

```
curl https://microclimates.solofounders.com/sf-weather/{neighborhood}
```

Replace `{neighborhood}` with the lowercase, underscore-separated neighborhood name.

### Available Neighborhoods

mission, castro, marina, soma, haight, noe_valley, outer_sunset, inner_sunset, outer_richmond, presidio, north_beach, pacific_heights, potrero, twin_peaks

### Handling Comparisons

If the user asks to compare weather between neighborhoods (e.g., "sf weather mission vs sunset"), fetch data for each neighborhood separately and present the results side by side.

### Formatting

Present the weather data in a clear, concise format. Include temperature, conditions, and any notable microclimate differences when comparing neighborhoods.
