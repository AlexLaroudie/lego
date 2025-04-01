import requests

# 1) L'URL qu'on veut appeler
url = "https://www.vinted.fr/api/v2/catalog/items"

# 2) Paramètres GET
params = {
    "page": 1,
    "per_page": 96,
    "time": "1742829193",      # date/time "fictive" qu'on voit dans la requête
    "search_text": "lego",
    "catalog_ids": "",
    "size_ids": "",
    "brand_ids": "",
    "status_ids": "",
    "color_ids": "",
    "material_ids": ""
}

# 3) Les en-têtes (headers) qu'on veut répliquer.
#    - Au minimum 'User-Agent' + 'Cookie' + 'x-csrf-token' (souvent requis pour Vinted).
#    - On peut coller des morceaux ci-dessous.
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "fr",
    "Referer": "https://www.vinted.fr/catalog?search_text=lego&time=1742829193",
    "x-anon-id": "3fb950eb-b624-4160-ad52-e671d3196492",
    "x-csrf-token": "75f6c9fa-dc8e-4e52-a000-e09dd4084b3e",    # celui vu dans la requête
    "x-money-object": "true"
    # etc.
}

# 4) Les cookies (très importants pour être reconnu).
#    Souvent, un 'session' ou 'access_token_web' est requis pour obtenir un 200 OK.
cookies = {
    # Copie-colle tout ou partie du cookie 'vinted_fr_session', etc.
    # Ici un *exemple* minimal. De ton côté, mets le gros bloc si nécessaire.
    "_vinted_fr_session": "VnRUTGtsdkFSNy9QUW1FVUpSTXdyaUpVQXNBRksxT09IV...",
    "access_token_web": "eyJraWQiOiJFNTdZZHJ1SHBsQWp1MmN... (long token) ...",
    # ...
}

# 5) On fait la requête GET
response = requests.get(
    url,
    params=params,
    headers=headers,
    cookies=cookies
)

# 6) Vérification & parsing JSON
if response.status_code == 200:
    data = response.json()  # renvoie un dict Python
    # tu peux inspecter les champs qui t'intéressent
    print("Réponse OK ! Extraits :")
    print("Nombre d'articles trouvés :", data["items_count"])
    print("Premier item :", data["items"][0] if data["items"] else "aucun")
else:
    print("Échec. Status code:", response.status_code)
    print("Texte de la réponse:", response.text)
