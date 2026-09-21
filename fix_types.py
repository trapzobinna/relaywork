import re, glob

# Fix tsconfig verbatimModuleSyntax if present or fix files
# Let us inspect tsconfig.json first and fix the type-only imports across all src ts/tsx files

for filepath in glob.glob("frontend/src/**/*.{ts,tsx}", recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change import { ... } from '../types' or './types' to import type { ... }
    # Or in client.ts: config.headers.Authorization = 'Bearer ' + token;
    content = content.replace("config.headers.Authorization = `Bearer ${token}`;", "config.headers.Authorization = 'Bearer ' + token;")
    content = content.replace("config.headers.Authorization = Bearer ;", "config.headers.Authorization = 'Bearer ' + token;")
    
    # Fix imports from types
    content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+([\'"].*types[\'"])', r'import type {\1} from \2', content)

    # In JobDetails.tsx, remove unused navigate if present
    if "JobDetails.tsx" in filepath:
        content = content.replace("const navigate = useNavigate();", "// const navigate = useNavigate();")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Type imports and client header fixed across all files.")
