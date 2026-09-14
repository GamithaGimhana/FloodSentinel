"""Geographic coordinates, provinces, and baseline hydrologic vulnerability factors for all 25 Sri Lankan districts."""

SRI_LANKA_DISTRICTS = [
    {
        "id": "colombo",
        "name": "Colombo",
        "province": "Western",
        "lat": 6.9271,
        "lon": 79.8612,
        "elevation_m": 10,
        "river_basin": "Kelani River Basin",
        "base_vuln": 0.85
    },
    {
        "id": "gampaha",
        "name": "Gampaha",
        "province": "Western",
        "lat": 7.0840,
        "lon": 79.9939,
        "elevation_m": 15,
        "river_basin": "Attanagalu Oya / Kelani",
        "base_vuln": 0.82
    },
    {
        "id": "kalutara",
        "name": "Kalutara",
        "province": "Western",
        "lat": 6.5854,
        "lon": 79.9607,
        "elevation_m": 12,
        "river_basin": "Kalu Ganga Basin",
        "base_vuln": 0.88
    },
    {
        "id": "kandy",
        "name": "Kandy",
        "province": "Central",
        "lat": 7.2906,
        "lon": 80.6337,
        "elevation_m": 500,
        "river_basin": "Mahaweli Ganga Basin",
        "base_vuln": 0.45
    },
    {
        "id": "matale",
        "name": "Matale",
        "province": "Central",
        "lat": 7.4675,
        "lon": 80.6234,
        "elevation_m": 360,
        "river_basin": "Amban Ganga / Mahaweli",
        "base_vuln": 0.40
    },
    {
        "id": "nuwara-eliya",
        "name": "Nuwara Eliya",
        "province": "Central",
        "lat": 6.9497,
        "lon": 80.7891,
        "elevation_m": 1868,
        "river_basin": "Kotmale Oya / Kelani headwaters",
        "base_vuln": 0.50
    },
    {
        "id": "galle",
        "name": "Galle",
        "province": "Southern",
        "lat": 6.0535,
        "lon": 80.2210,
        "elevation_m": 15,
        "river_basin": "Gin Ganga Basin",
        "base_vuln": 0.78
    },
    {
        "id": "matara",
        "name": "Matara",
        "province": "Southern",
        "lat": 5.9549,
        "lon": 80.5550,
        "elevation_m": 12,
        "river_basin": "Nilwala Ganga Basin",
        "base_vuln": 0.82
    },
    {
        "id": "hambantota",
        "name": "Hambantota",
        "province": "Southern",
        "lat": 6.1429,
        "lon": 81.1212,
        "elevation_m": 16,
        "river_basin": "Walawe Ganga / Kirindi Oya",
        "base_vuln": 0.42
    },
    {
        "id": "jaffna",
        "name": "Jaffna",
        "province": "Northern",
        "lat": 9.6615,
        "lon": 80.0255,
        "elevation_m": 8,
        "river_basin": "Peninsula Lagoons",
        "base_vuln": 0.35
    },
    {
        "id": "kilinochchi",
        "name": "Kilinochchi",
        "province": "Northern",
        "lat": 9.3803,
        "lon": 80.3770,
        "elevation_m": 18,
        "river_basin": "Kanakarayan Aru Basin",
        "base_vuln": 0.40
    },
    {
        "id": "mannar",
        "name": "Mannar",
        "province": "Northern",
        "lat": 8.9810,
        "lon": 79.9044,
        "elevation_m": 6,
        "river_basin": "Malwathu Oya Basin",
        "base_vuln": 0.48
    },
    {
        "id": "vavuniya",
        "name": "Vavuniya",
        "province": "Northern",
        "lat": 8.7542,
        "lon": 80.4982,
        "elevation_m": 100,
        "river_basin": "Parangi Aru Basin",
        "base_vuln": 0.38
    },
    {
        "id": "mullaitivu",
        "name": "Mullaitivu",
        "province": "Northern",
        "lat": 9.2671,
        "lon": 80.8142,
        "elevation_m": 14,
        "river_basin": "Nay Aru / Per Aru",
        "base_vuln": 0.44
    },
    {
        "id": "batticaloa",
        "name": "Batticaloa",
        "province": "Eastern",
        "lat": 7.7310,
        "lon": 81.6747,
        "elevation_m": 10,
        "river_basin": "Mundeni Aru / Batticaloa Lagoon",
        "base_vuln": 0.72
    },
    {
        "id": "ampara",
        "name": "Ampara",
        "province": "Eastern",
        "lat": 7.2912,
        "lon": 81.6724,
        "elevation_m": 35,
        "river_basin": "Gal Oya Basin",
        "base_vuln": 0.65
    },
    {
        "id": "trincomalee",
        "name": "Trincomalee",
        "province": "Eastern",
        "lat": 8.5874,
        "lon": 81.2152,
        "elevation_m": 12,
        "river_basin": "Mahaweli Ganga Delta",
        "base_vuln": 0.60
    },
    {
        "id": "kurunegala",
        "name": "Kurunegala",
        "province": "North Western",
        "lat": 7.4863,
        "lon": 80.3623,
        "elevation_m": 116,
        "river_basin": "Deduru Oya Basin",
        "base_vuln": 0.58
    },
    {
        "id": "puttalam",
        "name": "Puttalam",
        "province": "North Western",
        "lat": 8.0408,
        "lon": 79.8394,
        "elevation_m": 8,
        "river_basin": "Mi Oya / Kala Oya Basin",
        "base_vuln": 0.62
    },
    {
        "id": "anuradhapura",
        "name": "Anuradhapura",
        "province": "North Central",
        "lat": 8.3114,
        "lon": 80.4037,
        "elevation_m": 81,
        "river_basin": "Malwathu Oya / Yan Oya Basin",
        "base_vuln": 0.52
    },
    {
        "id": "polonnaruwa",
        "name": "Polonnaruwa",
        "province": "North Central",
        "lat": 7.9403,
        "lon": 81.0188,
        "elevation_m": 58,
        "river_basin": "Mahaweli Lowlands Basin",
        "base_vuln": 0.68
    },
    {
        "id": "badulla",
        "name": "Badulla",
        "province": "Uva",
        "lat": 6.9934,
        "lon": 81.0550,
        "elevation_m": 680,
        "river_basin": "Badulu Oya / Mahaweli",
        "base_vuln": 0.55
    },
    {
        "id": "monaragala",
        "name": "Monaragala",
        "province": "Uva",
        "lat": 6.8728,
        "lon": 81.3507,
        "elevation_m": 180,
        "river_basin": "Menik Ganga / Kumbukkan Oya",
        "base_vuln": 0.45
    },
    {
        "id": "ratnapura",
        "name": "Ratnapura",
        "province": "Sabaragamuwa",
        "lat": 6.6828,
        "lon": 80.4034,
        "elevation_m": 42,
        "river_basin": "Kalu Ganga Basin",
        "base_vuln": 0.95
    },
    {
        "id": "kegalle",
        "name": "Kegalle",
        "province": "Sabaragamuwa",
        "lat": 7.2513,
        "lon": 80.3464,
        "elevation_m": 120,
        "river_basin": "Kelani / Maha Oya Basin",
        "base_vuln": 0.80
    }
]
