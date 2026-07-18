import urllib.request
import json
from base64 import b64decode

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        res = urllib.request.urlopen(req)
        return res.read()
    except Exception as e:
        return b""

def main():
    repos_data = fetch('https://api.github.com/users/rkpothamsetti/repos?per_page=100')
    if not repos_data:
        print("Failed to fetch repos")
        return

    repos = json.loads(repos_data)
    results = []
    for r in repos:
        name = r.get('name')
        desc = r.get('description')
        url = r.get('html_url')
        
        # fetch languages
        lang_data = fetch(r.get('languages_url', ''))
        langs = list(json.loads(lang_data).keys()) if lang_data else []
        
        # fetch readme
        readme_data = fetch(f"https://api.github.com/repos/rkpothamsetti/{name}/readme")
        readme = ""
        if readme_data:
            try:
                readme_json = json.loads(readme_data)
                readme = b64decode(readme_json.get('content', '')).decode('utf-8', errors='ignore')
            except Exception as e:
                pass
                
        results.append({
            'name': name,
            'description': desc,
            'url': url,
            'languages': langs,
            'readme': readme[:1000] # First 1000 chars of README
        })

    with open('repos_info.json', 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Successfully wrote data for {len(results)} repos to repos_info.json")

if __name__ == '__main__':
    main()
