import React, { useState, useEffect, useRef } from "react";
import { Search, ChefHat, ArrowLeft, Clock, Users, Flame, Sun, Moon, Wine, Loader2, MapPin, Star, Shuffle } from "lucide-react";

const palette = {
  bg: "#fdf1e2", card: "#fffaf1", ink: "#241c15", inkSoft: "#6b5f52",
  mustard: "#f2941a", mustardDeep: "#d6790a", red: "#e0452c", green: "#5f9c3c",
  line: "rgba(43,36,32,0.12)",
};

const FOOD_EMOJIS = ["🍕", "🍩", "🥐", "🍓", "🌮", "🍜", "🥑", "🍇", "🧀", "🍔", "🍉", "🥖", "🍰", "🍋", "🍤", "🥕"];

const CATEGORIES = [
  { id: "breakfast", label: "Mic dejun", icon: Sun, desc: "Începe ziua bine" },
  { id: "lunch", label: "Prânz", icon: ChefHat, desc: "Mese consistente" },
  { id: "dinner", label: "Cină", icon: Moon, desc: "Rețete de seară" },
  { id: "drinks", label: "Băuturi", icon: Wine, desc: "Calde, reci, cu sau fără alcool" },
  { id: "romanian", label: "Mâncăruri românești", icon: MapPin, desc: "Toate clasicele, într-un loc" },
];

const ROMANIAN_DISHES = [
  "Sarmale", "Mici", "Ciorbă de burtă", "Ciorbă de perișoare", "Mămăligă",
  "Sărmăluțe în foi de viță", "Papanași", "Cozonac", "Tochitură", "Fasole bătută",
  "Zacuscă", "Ardei umpluți", "Ciulama de pui", "Piftie", "Drob",
  "Salată de vinete", "Chiftele", "Gulaș", "Ciorbă rădăuțeană", "Supă de fasole cu afumătură",
  "Plăcintă cu brânză", "Plăcintă cu mere", "Colivă", "Vărzare", "Bulz",
  "Ostropel de pui", "Musaca de cartofi", "Icre de crap", "Pastramă de oaie", "Cârnați de casă",
  "Prăjitură cu mac", "Cremșnit", "Salată de boeuf",
];

const CATEGORY_PROMPTS = {
  breakfast: "mic dejun (breakfast), din orice bucătărie a lumii",
  lunch: "prânz (lunch), din orice bucătărie a lumii",
  dinner: "cină (dinner), din orice bucătărie a lumii",
  drinks: "băuturi — calde, reci, cocktailuri, băuturi fără alcool, din orice cultură",
};

// --- local persistence (replaces the Claude.ai artifact storage bridge) ---
function loadLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

// --- talks to our own backend at /api/claude, which holds the real API key ---
async function callClaude(system, userText, maxTokens = 1000) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: userText }],
    }),
  });
  const data = await response.json();
  const text = (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n");
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export default function App() {
  const [view, setView] = useState("home"); // home | category | recipe
  const [activeCategory, setActiveCategory] = useState(null);
  const [dishLists, setDishLists] = useState({});
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState("");
  const [recipeCache, setRecipeCache] = useState({});
  const [favorites, setFavorites] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    document.body.style.background = palette.bg;
  }, []);

  useEffect(() => {
    const dl = loadLocal("savoro:dishlists");
    if (dl) setDishLists(dl);
    const rc = loadLocal("savoro:recipecache");
    if (rc) setRecipeCache(rc);
    const fv = loadLocal("savoro:favorites");
    if (fv) setFavorites(fv);
  }, []);

  const persistDishLists = (next) => {
    setDishLists(next);
    saveLocal("savoro:dishlists", next);
  };

  const persistRecipeCache = (next) => {
    setRecipeCache(next);
    saveLocal("savoro:recipecache", next);
  };

  const toggleFavorite = (dishName, recipeObj) => {
    const key = dishName.toLowerCase();
    const next = { ...favorites };
    if (next[key]) {
      delete next[key];
    } else {
      next[key] = recipeObj;
    }
    setFavorites(next);
    saveLocal("savoro:favorites", next);
  };

  const openCategory = async (catId) => {
    setActiveCategory(catId);
    setView("category");
    setSearchQuery("");
    if (dishLists[catId]) return;

    if (catId === "romanian") {
      persistDishLists({ ...dishLists, romanian: ROMANIAN_DISHES });
      return;
    }

    setLoadingList(true);
    try {
      const result = await callClaude(
        "Ești un chef expert. Răspunzi STRICT în format JSON, fără text în plus, fără markdown, fără backticks.",
        `Dă-mi o listă de 30 de preparate cunoscute pentru categoria: ${CATEGORY_PROMPTS[catId]}. Alege preparate variate, din cât mai multe culturi/bucătării diferite (română, italiană, asiatică, mexicană, orientală etc). Răspunde STRICT în acest format JSON: {"dishes": ["nume1", "nume2", ...]}`,
        500
      );
      persistDishLists({ ...dishLists, [catId]: result.dishes || [] });
    } catch (e) {
      persistDishLists({ ...dishLists, [catId]: [] });
    }
    setLoadingList(false);
  };

  const openRecipe = async (dishName) => {
    setView("recipe");
    setRecipeError("");
    if (recipeCache[dishName.toLowerCase()]) {
      setRecipe(recipeCache[dishName.toLowerCase()]);
      return;
    }
    setRecipe(null);
    setLoadingRecipe(true);
    try {
      const result = await callClaude(
        "Ești un chef expert care scrie rețete clare, pas cu pas, în limba română. Răspunzi STRICT în format JSON, fără text în plus, fără markdown, fără backticks.",
        `Dă-mi o rețetă completă pentru: "${dishName}". Răspunde STRICT în acest format JSON:
{
  "title": "Numele preparatului",
  "prepTime": "ex: 25 min",
  "difficulty": "Ușor / Mediu / Avansat",
  "servings": "ex: 4 porții",
  "ingredients": ["ingredient 1 cu cantitate", "ingredient 2 cu cantitate"],
  "steps": ["Pasul 1...", "Pasul 2..."],
  "tip": "un sfat scurt, opțional"
}`
      );
      persistRecipeCache({ ...recipeCache, [dishName.toLowerCase()]: result });
      setRecipe(result);
    } catch (e) {
      setRecipeError("Nu am putut genera rețeta acum. Încearcă din nou.");
    }
    setLoadingRecipe(false);
  };

  const handleGlobalSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    openRecipe(q);
  };

  const handleSurprise = async () => {
    setView("recipe");
    setRecipeError("");
    setRecipe(null);
    setLoadingRecipe(true);
    try {
      const result = await callClaude(
        "Ești un chef expert și creativ. Alegi TU, la întâmplare, un preparat surprinzător și delicios (poate fi mic dejun, prânz, cină sau băutură, din orice cultură a lumii) și scrii rețeta completă, clar, pas cu pas, în limba română. Răspunzi STRICT în format JSON, fără text în plus, fără markdown, fără backticks.",
        `Surprinde-mă cu un preparat random și interesant. Răspunde STRICT în acest format JSON:
{
  "title": "Numele preparatului",
  "prepTime": "ex: 25 min",
  "difficulty": "Ușor / Mediu / Avansat",
  "servings": "ex: 4 porții",
  "ingredients": ["ingredient 1 cu cantitate", "ingredient 2 cu cantitate"],
  "steps": ["Pasul 1...", "Pasul 2..."],
  "tip": "un sfat scurt, opțional"
}`
      );
      persistRecipeCache({ ...recipeCache, [result.title.toLowerCase()]: result });
      setRecipe(result);
    } catch (e) {
      setRecipeError("Nu am putut genera o surpriză acum. Încearcă din nou.");
    }
    setLoadingRecipe(false);
  };

  const currentList = activeCategory ? dishLists[activeCategory] || [] : [];
  const filteredList = searchQuery.trim()
    ? currentList.filter((d) => d.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : currentList;

  return (
    <div style={styles.app}>
      <div style={styles.foodBg} aria-hidden="true">
        {Array.from({ length: 140 }).map((_, i) => (
          <span key={i} style={styles.foodBgItem}>{FOOD_EMOJIS[i % FOOD_EMOJIS.length]}</span>
        ))}
      </div>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand} onClick={() => setView("home")}>
            <div style={styles.brandMark}><ChefHat size={16} color="#fff" /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.15rem", lineHeight: 1 }}>Savoro</div>
              <div style={styles.brandSub}>Deliu Răzvan</div>
            </div>
          </div>
          {view !== "home" && (
            <button style={styles.backBtn} onClick={() => setView(activeCategory ? "category" : "home")}>
              <ArrowLeft size={15} /> Înapoi
            </button>
          )}
        </div>
      </header>

      <div style={styles.searchBarWrap}>
        <div style={styles.searchBar}>
          <Search size={16} color={palette.inkSoft} />
          <input
            ref={searchRef}
            style={styles.searchInput}
            placeholder={
              view === "category" ? "Caută în listă, sau scrie orice fel de mâncare..." : "Caută orice fel de mâncare sau băutură..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
          />
          <button style={styles.searchGoBtn} onClick={handleGlobalSearch}>Caută</button>
        </div>
      </div>

      <main style={styles.main}>
        {view === "home" && (
          <div style={styles.homeWrap}>
            <div style={styles.heroText}>
              <h1 style={styles.h1}>Rețete pentru orice poftă</h1>
              <p style={styles.heroP}>
                Alege un moment al zilei, sau caută direct orice fel de mâncare din lume — rețeta apare pas cu pas, generată pe loc.
              </p>
              <button style={styles.surpriseBtn} onClick={handleSurprise}>
                <Shuffle size={16} /> Surprinde-mă
              </button>
            </div>

            {Object.keys(favorites).length > 0 && (
              <div style={styles.favSection}>
                <h3 style={{ ...styles.h3, margin: "0 0 12px", textAlign: "left" }}>⭐ Favoritele tale</h3>
                <div style={styles.favRow}>
                  {Object.values(favorites).map((fav) => (
                    <div key={fav.title} style={styles.favChip} onClick={() => { setRecipe(fav); setView("recipe"); }}>
                      {fav.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ ...styles.catGrid, gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)" }}>
              {CATEGORIES.map((c, idx) => {
                const Icon = c.icon;
                const accents = [palette.mustard, palette.red, palette.green, palette.mustardDeep];
                const accent = accents[idx % accents.length];
                return (
                  <div key={c.id} style={{ ...styles.catCard, borderTop: `3px solid ${accent}` }} onClick={() => openCategory(c.id)}>
                    <div style={styles.catIcon}><Icon size={26} color={accent} /></div>
                    <div style={styles.catLabel}>{c.label}</div>
                    <div style={styles.catDesc}>{c.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "category" && (
          <div style={styles.listWrap}>
            <h2 style={styles.h2}>{CATEGORIES.find((c) => c.id === activeCategory)?.label}</h2>
            {loadingList ? (
              <div style={styles.loadingRow}>
                <Loader2 size={18} className="spin" /> Se generează rețetele...
              </div>
            ) : (
              <div style={{ ...styles.dishGrid, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)" }}>
                {filteredList.length === 0 && (
                  <p style={{ color: palette.inkSoft }}>
                    Niciun rezultat în listă — apasă "Caută" ca să generez rețeta pentru "{searchQuery}".
                  </p>
                )}
                {filteredList.map((dish) => (
                  <div key={dish} style={styles.dishCard} onClick={() => openRecipe(dish)}>
                    {dish}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "recipe" && (
          <div style={styles.recipeWrap}>
            {loadingRecipe && (
              <div style={styles.loadingRow}>
                <Loader2 size={18} className="spin" /> Se generează rețeta...
              </div>
            )}
            {recipeError && <p style={{ color: palette.red }}>{recipeError}</p>}
            {recipe && (
              <div style={styles.recipeCard}>
                <div style={styles.recipeTitleRow}>
                  <h2 style={{ ...styles.h2, marginBottom: 0 }}>{recipe.title}</h2>
                  <button
                    style={styles.favBtn(!!favorites[recipe.title.toLowerCase()])}
                    onClick={() => toggleFavorite(recipe.title, recipe)}
                  >
                    <Star size={15} fill={favorites[recipe.title.toLowerCase()] ? palette.mustard : "none"} />
                    {favorites[recipe.title.toLowerCase()] ? "Salvat" : "Salvează"}
                  </button>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaChip}><Clock size={13} /> {recipe.prepTime}</span>
                  <span style={styles.metaChip}><Flame size={13} /> {recipe.difficulty}</span>
                  <span style={styles.metaChip}><Users size={13} /> {recipe.servings}</span>
                </div>

                <h3 style={styles.h3}>Ingrediente</h3>
                <ul style={styles.ingList}>
                  {(recipe.ingredients || []).map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>

                <h3 style={styles.h3}>Mod de preparare</h3>
                <ol style={styles.stepList}>
                  {(recipe.steps || []).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>

                {recipe.tip && <p style={styles.tipBox}>💡 {recipe.tip}</p>}
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        © 2026 Savoro — rețete generate pe loc, pentru orice fel de mâncare sau băutură din lume.
      </footer>

      <style>{`.spin { animation: savoro-spin 1s linear infinite; } @keyframes savoro-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  app: { minHeight: "100vh", width: "100%", background: palette.bg, color: palette.ink, fontFamily: "'Nunito Sans', sans-serif", display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden" },
  foodBg: {
    position: "fixed", inset: 0, zIndex: 0, display: "flex", flexWrap: "wrap", alignContent: "flex-start",
    overflow: "hidden", pointerEvents: "none", opacity: 0.08, fontSize: 34, lineHeight: "60px",
  },
  foodBgItem: { width: 60, textAlign: "center" },
  header: { position: "sticky", top: 0, zIndex: 20, background: "rgba(253,241,226,0.88)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${palette.line}` },
  headerInner: { maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" },
  brand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  brandSub: { fontSize: 10.5, color: palette.inkSoft, marginTop: 2 },
  brandMark: { width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${palette.mustard}, ${palette.red})`, display: "flex", alignItems: "center", justifyContent: "center" },
  backBtn: { background: "transparent", border: `1px solid ${palette.line}`, borderRadius: 8, padding: "7px 12px", color: palette.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  searchBarWrap: { position: "relative", zIndex: 1, display: "flex", justifyContent: "center", padding: "20px 20px 0" },
  searchBar: { width: "100%", maxWidth: 700, background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 24px -12px rgba(43,36,32,0.2)" },
  searchInput: { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14.5, color: palette.ink },
  searchGoBtn: { background: palette.red, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  main: { position: "relative", zIndex: 1, flex: 1, maxWidth: 900, width: "100%", margin: "0 auto", padding: "30px 20px 60px" },
  homeWrap: { textAlign: "center" },
  heroText: { maxWidth: 560, margin: "0 auto 40px" },
  h1: { fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 700, marginBottom: 14 },
  heroP: { color: palette.inkSoft, fontSize: 15.5, lineHeight: 1.6 },
  surpriseBtn: { marginTop: 18, background: `linear-gradient(135deg, ${palette.mustard}, ${palette.red})`, color: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 },
  favSection: { maxWidth: 700, margin: "0 auto 30px", textAlign: "left" },
  favRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  favChip: { background: "rgba(217,154,43,0.14)", border: `1px solid ${palette.mustard}`, borderRadius: 999, padding: "8px 14px", fontSize: 13, cursor: "pointer" },
  recipeTitleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  favBtn: (active) => ({
    display: "flex", alignItems: "center", gap: 6, background: active ? "rgba(217,154,43,0.15)" : "transparent",
    border: `1px solid ${active ? palette.mustard : palette.line}`, borderRadius: 999, padding: "7px 14px",
    fontSize: 12.5, color: active ? palette.mustardDeep : palette.inkSoft, cursor: "pointer", fontWeight: 600,
  }),
  catGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  catCard: { background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 18, padding: "26px 16px", cursor: "pointer", transition: "transform .15s ease" },
  catIcon: { marginBottom: 10 },
  catLabel: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 },
  catDesc: { fontSize: 12.5, color: palette.inkSoft },
  listWrap: {},
  h2: { fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, marginBottom: 20 },
  h3: { fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, margin: "22px 0 10px" },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: palette.inkSoft, fontSize: 14.5, padding: "20px 0" },
  dishGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  dishCard: { background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  recipeWrap: {},
  recipeCard: { background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 20, padding: "30px 28px" },
  metaRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 },
  metaChip: { display: "flex", alignItems: "center", gap: 6, background: palette.bg, border: `1px solid ${palette.line}`, borderRadius: 999, padding: "6px 12px", fontSize: 12.5 },
  ingList: { paddingLeft: 20, color: palette.inkSoft, fontSize: 14.5, lineHeight: 1.9 },
  stepList: { paddingLeft: 20, color: palette.ink, fontSize: 14.5, lineHeight: 1.9 },
  tipBox: { marginTop: 18, background: "rgba(217,154,43,0.12)", border: `1px solid ${palette.mustard}`, borderRadius: 12, padding: "12px 16px", fontSize: 13.5 },
  footer: { position: "relative", zIndex: 1, textAlign: "center", padding: "24px 20px", color: palette.inkSoft, fontSize: 12.5, borderTop: `1px solid ${palette.line}`, background: palette.bg },
};
