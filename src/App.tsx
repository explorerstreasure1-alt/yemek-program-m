import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  House,
  Info,
  Leaf,
  Moon,
  Printer,
  ShoppingBasket,
  Sun,
} from "lucide-react";
import { plans } from "./data/plans";

type MobileView = "today" | "plan" | "shopping" | "guide";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const mobileTabs = [
  { view: "today", label: "Bugün", icon: House },
  { view: "plan", label: "Plan", icon: CalendarDays },
  { view: "shopping", label: "Liste", icon: ShoppingBasket },
  { view: "guide", label: "Bilgi", icon: BookOpen },
] as const;

const days = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

const storageKey = "denge-sofrasi-shopping-v1";

function readSavedChecks(): Record<string, string[]> {
  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed: unknown = saved ? JSON.parse(saved) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string[]>;
    }
  } catch {
    // The planner still works if browser storage is unavailable.
  }
  return {};
}

function fallbackCopy(text: string) {
  const field = document.createElement("textarea");
  field.value = text;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy failed");
}

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [today, setToday] = useState(() => new Date());
  const [checkedByMonth, setCheckedByMonth] = useState(readSavedChecks);
  const [copyStatus, setCopyStatus] = useState<"idle" | "done" | "error">("idle");
  const [mobileView, setMobileView] = useState<MobileView>("today");
  const [openDay, setOpenDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() =>
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
  const tabsRef = useRef<HTMLDivElement>(null);
  const monthButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const copyTimeout = useRef<number | null>(null);

  const month = plans[selectedMonth];
  const checkedItems = Array.isArray(checkedByMonth[selectedMonth])
    ? checkedByMonth[selectedMonth]
    : [];
  const now = today;
  const todayIndex = (now.getDay() + 6) % 7;
  const todayPlan = plans[now.getMonth()];
  const todayDate = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(now);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(checkedByMonth));
    } catch {
      // Private browsing can disable storage without affecting the checklist.
    }
  }, [checkedByMonth]);

  useEffect(() => {
    const tabs = tabsRef.current;
    const active = monthButtons.current[selectedMonth];
    if (tabs && active && tabs.scrollWidth > tabs.clientWidth) {
      tabs.scrollTo({
        left: active.offsetLeft - tabs.clientWidth / 2 + active.clientWidth / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  }, [selectedMonth]);

  useEffect(() => {
    return () => {
      if (copyTimeout.current !== null) window.clearTimeout(copyTimeout.current);
    };
  }, []);

  useEffect(() => {
    const refreshDate = () => {
      if (!document.hidden) {
        setToday((previous) => {
          const next = new Date();
          return previous.toDateString() === next.toDateString() ? previous : next;
        });
      }
    };
    document.addEventListener("visibilitychange", refreshDate);
    const interval = window.setInterval(refreshDate, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", refreshDate);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function chooseMonth(index: number) {
    const next = (index + plans.length) % plans.length;
    setSelectedMonth(next);
    setOpenDay(next === new Date().getMonth() ? (new Date().getDay() + 6) % 7 : 0);
    setCopyStatus("idle");
  }

  function switchMobileView(view: MobileView) {
    setToday(new Date());
    setMobileView(view);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  async function requestInstall() {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") setIsInstalled(true);
      } catch {
        setShowInstallHelp(true);
        switchMobileView("guide");
      } finally {
        setInstallPrompt(null);
      }
    } else {
      setShowInstallHelp(true);
      switchMobileView("guide");
    }
  }

  function handleMonthKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % plans.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + plans.length) % plans.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = plans.length - 1;
    else return;

    event.preventDefault();
    chooseMonth(next);
    monthButtons.current[next]?.focus();
  }

  function toggleShoppingItem(item: string) {
    setCheckedByMonth((previous) => {
      const current = Array.isArray(previous[selectedMonth]) ? previous[selectedMonth] : [];
      return {
        ...previous,
        [selectedMonth]: current.includes(item)
          ? current.filter((checked) => checked !== item)
          : [...current, item],
      };
    });
  }

  function clearShoppingItems() {
    setCheckedByMonth((previous) => ({ ...previous, [selectedMonth]: [] }));
  }

  async function copyShoppingList() {
    const text = `${month.name} alışveriş listesi\n${month.shopping
      .map((item) => `- ${item}`)
      .join("\n")}`;

    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          fallbackCopy(text);
        }
      } else {
        fallbackCopy(text);
      }
      setCopyStatus("done");
    } catch {
      setCopyStatus("error");
    }

    if (copyTimeout.current !== null) window.clearTimeout(copyTimeout.current);
    copyTimeout.current = window.setTimeout(() => setCopyStatus("idle"), 3000);
  }

  return (
    <div className="site-shell" id="top">
      <div className="mobile-app">
        <header className="mobile-app-header">
          <div className="mobile-app-wordmark" aria-label="Denge Sofrası">
            <span className="brand-mark" aria-hidden="true"><Leaf size={18} strokeWidth={1.8} /></span>
            <span className="brand-name">denge<span>sofrası</span><b>.</b></span>
          </div>
          {!isInstalled && (
            <button className="mobile-header-install" type="button" onClick={requestInstall}>
              <Download size={16} strokeWidth={1.9} /> Yükle
            </button>
          )}
        </header>

        <main className="mobile-app-main">
          {mobileView === "today" && (
            <section className="mobile-home" aria-labelledby="mobile-home-title">
              <div className="mobile-home-hero">
                <div className="mobile-home-photo" aria-hidden="true" />
                <div className="mobile-home-shade" aria-hidden="true" />
                <div className="mobile-home-hero-copy">
                  <p>12 AYLIK / SADECE İKİ ÖĞÜN</p>
                  <h1 id="mobile-home-title">Denge<br /><em>Sofrası.</em></h1>
                </div>
              </div>
              <div className="mobile-home-body">
                <div className="mobile-today-date">
                  <span>{todayDate}</span>
                  <span>{todayPlan.name} planı</span>
                </div>
                <h2>Bugünün menüsü.</h2>
                <div className="mobile-today-meals">
                  <article className="mobile-today-meal">
                    <div className="mobile-meal-time"><Sun size={17} strokeWidth={1.8} /> SABAH</div>
                    <h3>{todayPlan.breakfasts[todayIndex].title}</h3>
                    <p>{todayPlan.breakfasts[todayIndex].detail}</p>
                  </article>
                  <article className="mobile-today-meal">
                    <div className="mobile-meal-time"><Moon size={17} strokeWidth={1.8} /> AKŞAM</div>
                    <h3>{todayPlan.dinners[todayIndex].title}</h3>
                    <p>{todayPlan.dinners[todayIndex].detail}</p>
                  </article>
                </div>
                <button className="mobile-inline-link" type="button" onClick={() => switchMobileView("plan")}>
                  Haftanın tamamını gör <ArrowRight size={18} />
                </button>
                <button className="mobile-safety-link" type="button" onClick={() => switchMobileView("guide")}>
                  <Info size={18} strokeWidth={1.8} />
                  <span>İki öğün herkese uygun olmayabilir. Önemli bilgiyi oku.</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </section>
          )}

          {mobileView === "plan" && (
            <section className="mobile-screen" aria-labelledby="mobile-plan-title">
              <div className="mobile-screen-heading">
                <p className="eyebrow">12 AYLIK YEMEK PLANI</p>
                <h1 id="mobile-plan-title">Yedi günlük<br /><em>kolay düzen.</em></h1>
                <p>Ayını seç. Sabah ve akşam menüsünü o ay boyunca tekrar edebilirsin.</p>
              </div>
              <div className="mobile-month-picker">
                <label htmlFor="mobile-plan-month">AY SEÇ</label>
                <div className="mobile-select-wrap">
                  <select id="mobile-plan-month" value={selectedMonth} onChange={(event) => chooseMonth(Number(event.target.value))}>
                    {plans.map((item, index) => <option value={index} key={item.name}>{item.name}</option>)}
                  </select>
                  <ChevronDown size={22} strokeWidth={1.7} aria-hidden="true" />
                </div>
              </div>
              <p className="mobile-month-context">{month.description}</p>
              <div className="mobile-days-list" key={selectedMonth}>
                {days.map((day, index) => (
                  <div className="mobile-day-row" key={day}>
                    <button
                      className="mobile-day-trigger"
                      type="button"
                      aria-expanded={openDay === index}
                      aria-controls={`mobile-day-panel-${index}`}
                      onClick={() => setOpenDay(openDay === index ? -1 : index)}
                    >
                      <span className="mobile-day-left"><small>{String(index + 1).padStart(2, "0")}</small><strong>{day}</strong></span>
                      <span className="mobile-day-right">
                        {selectedMonth === now.getMonth() && index === todayIndex && <small>BUGÜN</small>}
                        <ChevronDown size={20} strokeWidth={1.7} aria-hidden="true" />
                      </span>
                    </button>
                    <div className="mobile-day-panel" id={`mobile-day-panel-${index}`} hidden={openDay !== index}>
                      <div className="mobile-day-meal">
                        <span>SABAH</span>
                        <h3>{month.breakfasts[index].title}</h3>
                        <p>{month.breakfasts[index].detail}</p>
                      </div>
                      <div className="mobile-day-meal">
                        <span>AKŞAM</span>
                        <h3>{month.dinners[index].title}</h3>
                        <p>{month.dinners[index].detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mobile-plan-footnote">
                Bu yedi günlük menü örnektir. Günleri değiştirebilirsin; porsiyonlar kişisel sağlık durumuna göre ayarlanmalıdır.
              </p>
              <button className="mobile-inline-link" type="button" onClick={() => switchMobileView("guide")}>
                İki öğünle ilgili önemli bilgi <ArrowRight size={18} />
              </button>
            </section>
          )}

          {mobileView === "shopping" && (
            <section className="mobile-screen" aria-labelledby="mobile-shopping-title">
              <div className="mobile-screen-heading">
                <p className="eyebrow">PRATİK ALIŞVERİŞ</p>
                <h1 id="mobile-shopping-title">Pazar<br /><em>listen.</em></h1>
                <p>Alacaklarını işaretle. Liste bu telefonda saklanır.</p>
              </div>
              <div className="mobile-month-picker">
                <label htmlFor="mobile-shopping-month">HANGİ AY?</label>
                <div className="mobile-select-wrap">
                  <select id="mobile-shopping-month" value={selectedMonth} onChange={(event) => chooseMonth(Number(event.target.value))}>
                    {plans.map((item, index) => <option value={index} key={item.name}>{item.name}</option>)}
                  </select>
                  <ChevronDown size={22} strokeWidth={1.7} aria-hidden="true" />
                </div>
              </div>
              <p className="mobile-month-context">Taze malzemeleri haftalık al; miktarı kişi sayına göre ayarla.</p>
              <div className="mobile-shopping-list">
                <div className="shopping-progress">
                  <span>{checkedItems.length} / {month.shopping.length} işaretlendi</span>
                  {checkedItems.length > 0 && <button type="button" onClick={clearShoppingItems}>Temizle</button>}
                </div>
                <ul className="shopping-items">
                  {month.shopping.map((item) => (
                    <li key={item}>
                      <label className={checkedItems.includes(item) ? "shopping-item checked" : "shopping-item"}>
                        <input type="checkbox" checked={checkedItems.includes(item)} onChange={() => toggleShoppingItem(item)} />
                        <span className="custom-check" aria-hidden="true"><Check size={14} strokeWidth={2.5} /></span>
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <button className="copy-button" type="button" onClick={copyShoppingList}>
                  {copyStatus === "done" ? <Check size={18} /> : <Copy size={18} strokeWidth={1.8} />}
                  {copyStatus === "done" ? "Liste kopyalandı" : copyStatus === "error" ? "Kopyalanamadı, tekrar dene" : "Listeyi kopyala"}
                </button>
              </div>
            </section>
          )}

          {mobileView === "guide" && (
            <section className="mobile-screen mobile-guide-screen" aria-labelledby="mobile-guide-title">
              <div className="mobile-screen-heading">
                <p className="eyebrow">TABAK REHBERİ</p>
                <h1 id="mobile-guide-title">Basit bir<br /><em>denge.</em></h1>
                <p>Akşam tabağının yarısı nişastasız sebze, dörtte biri protein, kalan dörtte biri tam tahıl veya bakliyat olsun.</p>
              </div>
              <div className="mobile-guide-plate" role="img" aria-label="Yarım tabak sebze, çeyrek tabak protein, çeyrek tabak tam tahıl">
                <div className="plate-disc">
                  <div className="plate-label plate-vegetable"><strong>½</strong><span>Sebze</span></div>
                  <div className="plate-label plate-protein"><strong>¼</strong><span>Protein</span></div>
                  <div className="plate-label plate-grain"><strong>¼</strong><span>Tam tahıl</span></div>
                </div>
              </div>
              <p className="mobile-guide-caption">İçecek olarak su veya şekersiz çay seç. Bakliyat hem protein hem karbonhidrat içerir.</p>
              <div className="mobile-medical-note">
                <Info size={21} strokeWidth={1.7} aria-hidden="true" />
                <h2>Önemli sağlık notu</h2>
                <p>
                  Bu menü kişiye özel tedavi değildir. İnsülin ya da gliklazid / glimepirid gibi ilaçlar kullanıyorsan iki öğün arasındaki uzun açlık kan şekerini düşürebilir. Başlamadan doktoruna veya diyetisyenine danış; ilaçlarını bu plana göre değiştirme. Böbrek sorunu veya ileri karaciğer hastalığında da ayrıca değerlendirme gerekir.
                </p>
              </div>
              <div className="mobile-install-section">
                <Download size={22} strokeWidth={1.7} aria-hidden="true" />
                <h2>Telefonuna ekle.</h2>
                <p>Ana ekranından bir uygulama gibi açılır. İlk ziyaretten sonra yemek planına çevrimdışı da ulaşabilirsin.</p>
                {!isInstalled ? (
                  <button className="mobile-install-button" type="button" onClick={requestInstall}>
                    Uygulamayı yükle <ArrowUpRight size={19} />
                  </button>
                ) : <p className="mobile-installed-text">Uygulama ana ekranında hazır.</p>}
                {(showInstallHelp || !installPrompt) && !isInstalled && (
                  <div className="mobile-install-steps">
                    <p><strong>iPhone:</strong> Safari'de Paylaş menüsünü aç, ardından "Ana Ekrana Ekle" seç.</p>
                    <p><strong>Android:</strong> Chrome menüsünden "Uygulamayı yükle" veya "Ana ekrana ekle" seç.</p>
                  </div>
                )}
              </div>
              <div className="mobile-guide-sources">
                <span>KAYNAKLAR</span>
                <a href="https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html" target="_blank" rel="noreferrer noopener">CDC, tabak yöntemi <ArrowUpRight size={15} /></a>
                <a href="https://easl.eu/publication/easl-easd-easo-clinical-practice-guidelines-managment-of-metabolic-dysfunction-associated-steatotic-liver-disease/" target="_blank" rel="noreferrer noopener">EASL, karaciğer rehberi <ArrowUpRight size={15} /></a>
                <a href="https://www.cdc.gov/diabetes/about/low-blood-sugar-hypoglycemia.html" target="_blank" rel="noreferrer noopener">CDC, düşük kan şekeri <ArrowUpRight size={15} /></a>
              </div>
            </section>
          )}
        </main>

        <nav className="mobile-bottom-nav" aria-label="Uygulama menüsü">
          {mobileTabs.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              type="button"
              className={mobileView === view ? "active" : ""}
              aria-current={mobileView === view ? "page" : undefined}
              onClick={() => switchMobileView(view)}
            >
              <Icon size={21} strokeWidth={mobileView === view ? 2.1 : 1.7} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <header className="site-header">
        <div className="wide-container header-inner">
          <a className="brand" href="#top" aria-label="Denge Sofrası, sayfa başına dön">
            <span className="brand-mark" aria-hidden="true">
              <Leaf size={19} strokeWidth={1.9} />
            </span>
            <span className="brand-name">
              denge<span>sofrası</span><b>.</b>
            </span>
          </a>
          <nav className="main-nav" aria-label="Ana menü">
            <a href="#program">Yemek planı</a>
            <a href="#nasil">Tabak rehberi</a>
            <a href="#guvenlik">Önemli not</a>
          </nav>
          <a className="header-action" href="#program">
            Planı aç <ArrowUpRight size={17} strokeWidth={1.8} />
          </a>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-tint" aria-hidden="true" />
          <div className="wide-container hero-inner">
            <div className="hero-copy">
              <p className="hero-kicker"><span /> 12 AYLIK ÖRNEK YEMEK PLANI</p>
              <h1 id="hero-title">
                Denge<br />
                <em>Sofrası<span>.</span></em>
              </h1>
              <p className="hero-description">
                Kan şekeri yüksekliği ve karaciğer yağlanması için düşünülmüş,
                yalnızca sabah ve akşamdan oluşan sade öğün fikirleri.
              </p>
              <div className="hero-actions">
                <a className="primary-action" href="#program">
                  12 aylık planı gör <ArrowUpRight size={20} strokeWidth={1.8} />
                </a>
                <a className="text-action" href="#nasil">
                  Nasıl kullanılır? <ArrowDown size={17} strokeWidth={1.8} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="program-section" id="program" aria-labelledby="program-title">
          <div className="wide-container">
            <div className="program-intro">
              <div>
                <p className="eyebrow">BİR YIL, SADE BİR DÜZEN</p>
                <h2 id="program-title">Her ay başka,<br /><em>uygulaması kolay.</em></h2>
              </div>
              <p className="intro-description">
                Ayını seç, yedi günlük sabah-akşam menüsünü ay boyunca tekrar et.
                Günleri kendi hayatına göre yer değiştirebilirsin.
              </p>
            </div>

            <div className="safety-strip" role="note">
              <Info size={21} strokeWidth={1.7} aria-hidden="true" />
              <p>
                <strong>İki öğün herkese uygun olmayabilir.</strong> Özellikle insülin veya
                kan şekerini düşüren bazı ilaçları kullanıyorsan uzun açlık riskli olabilir.
              </p>
              <a href="#guvenlik">Önemli bilgiyi oku <ArrowRight size={17} /></a>
            </div>

            <div className="month-heading">
              <div>
                <p className="eyebrow">AYINI SEÇ</p>
                <div className="month-title-line" aria-live="polite">
                  <h3>{month.name}</h3>
                  <span className="month-count">
                    {String(selectedMonth + 1).padStart(2, "0")} <small>/ 12</small>
                  </span>
                </div>
                <p className="month-description">{month.description}</p>
              </div>
              <div className="month-arrows" role="group" aria-label="Aylar arasında gezin">
                <button
                  type="button"
                  onClick={() => chooseMonth(selectedMonth - 1)}
                  aria-label="Önceki ay"
                >
                  <ChevronLeft size={23} strokeWidth={1.6} />
                </button>
                <button
                  type="button"
                  onClick={() => chooseMonth(selectedMonth + 1)}
                  aria-label="Sonraki ay"
                >
                  <ChevronRight size={23} strokeWidth={1.6} />
                </button>
              </div>
            </div>

            <div className="month-tabs" role="tablist" aria-label="Yemek planı ayları" ref={tabsRef}>
              {plans.map((item, index) => (
                <button
                  key={item.name}
                  ref={(element) => { monthButtons.current[index] = element; }}
                  id={`month-tab-${index}`}
                  role="tab"
                  type="button"
                  aria-selected={selectedMonth === index}
                  aria-controls="month-panel"
                  tabIndex={selectedMonth === index ? 0 : -1}
                  onClick={() => chooseMonth(index)}
                  onKeyDown={(event) => handleMonthKeyDown(event, index)}
                  className={selectedMonth === index ? "active" : ""}
                >
                  <span className="month-tab-number">{String(index + 1).padStart(2, "0")}</span>
                  <span>{item.short}</span>
                </button>
              ))}
            </div>

            <div id="month-panel" role="tabpanel" aria-labelledby={`month-tab-${selectedMonth}`}>
              <div className="plan-toolbar">
                <p>7 GÜNLÜK DÖNGÜ <span aria-hidden="true">/</span> SABAH + AKŞAM</p>
                <button type="button" onClick={() => window.print()}>
                  <Printer size={17} strokeWidth={1.7} /> Planı yazdır
                </button>
              </div>

              <div className="month-content" key={selectedMonth}>
                <div className="plan-layout">
                  <div className="meal-table" role="region" aria-label={`${month.name} yedi günlük yemek planı`}>
                    <div className="table-head" aria-hidden="true">
                      <span>GÜN</span>
                      <span>SABAH KAHVALTISI</span>
                      <span>AKŞAM YEMEĞİ</span>
                    </div>
                    <ol className="week-list">
                      {days.map((day, index) => {
                        const isToday = selectedMonth === now.getMonth() && index === todayIndex;
                        return (
                          <li className={`meal-row${isToday ? " today-row" : ""}`} key={day}>
                            <div className="day-cell">
                              <span className="day-number">{String(index + 1).padStart(2, "0")}</span>
                              <strong>{day}</strong>
                              {isToday && <span className="today-tag">BUGÜN</span>}
                            </div>
                            <div className="meal-cell">
                              <span className="mobile-meal-label">SABAH</span>
                              <h4>{month.breakfasts[index].title}</h4>
                              <p>{month.breakfasts[index].detail}</p>
                            </div>
                            <div className="meal-cell">
                              <span className="mobile-meal-label">AKŞAM</span>
                              <h4>{month.dinners[index].title}</h4>
                              <p>{month.dinners[index].detail}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <aside className="shopping-panel" aria-labelledby="shopping-title">
                    <div className="shopping-topline">
                      <ShoppingBasket size={23} strokeWidth={1.5} aria-hidden="true" />
                      <span>PRATİK ALIŞVERİŞ</span>
                    </div>
                    <h3 id="shopping-title">Bu ayın<br /><em>pazar listesi.</em></h3>
                    <p className="shopping-description">
                      Taze ürünleri haftalık al. Miktarları evdeki kişi sayısına göre ayarla.
                    </p>
                    <div className="shopping-progress">
                      <span>{checkedItems.length} / {month.shopping.length} işaretlendi</span>
                      {checkedItems.length > 0 && (
                        <button type="button" onClick={clearShoppingItems}>Temizle</button>
                      )}
                    </div>
                    <ul className="shopping-items">
                      {month.shopping.map((item) => (
                        <li key={item}>
                          <label className={checkedItems.includes(item) ? "shopping-item checked" : "shopping-item"}>
                            <input
                              type="checkbox"
                              checked={checkedItems.includes(item)}
                              onChange={() => toggleShoppingItem(item)}
                            />
                            <span className="custom-check" aria-hidden="true"><Check size={13} strokeWidth={2.5} /></span>
                            <span>{item}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <button className="copy-button" type="button" onClick={copyShoppingList}>
                      {copyStatus === "done" ? <Check size={18} /> : <Copy size={18} strokeWidth={1.8} />}
                      {copyStatus === "done"
                        ? "Liste kopyalandı"
                        : copyStatus === "error"
                          ? "Kopyalanamadı, tekrar dene"
                          : "Listeyi kopyala"}
                    </button>
                  </aside>
                </div>
              </div>
              <p className="rotation-note">
                <span aria-hidden="true">*</span> Bu yedi günlük düzeni ay içinde tekrar edebilirsin.
                Öğünlerin ve porsiyonların senin sağlık durumuna göre değişmesi gerekebilir.
              </p>
            </div>
          </div>
        </section>

        <section className="plate-section" id="nasil" aria-labelledby="plate-title">
          <div className="wide-container plate-layout">
            <div className="plate-copy">
              <p className="eyebrow eyebrow-light">TABAK REHBERİ</p>
              <h2 id="plate-title">Tabağını<br /><em>üçe böl.</em></h2>
              <p>
                Akşam tabağının yarısını nişastasız sebzeye, dörtte birini balık, tavuk veya yumurta gibi
                proteine; kalanını tam tahıl ya da bakliyata ayır. İçecek olarak su veya
                şekersiz çay seç.
              </p>
              <p className="plate-small-note">
                Bakliyat hem protein hem karbonhidrat içerir. Şekerli içeceklerden ve
                alkolden uzak durmak da iyi bir başlangıçtır.
              </p>
            </div>
            <div className="plate-visual" role="img" aria-label="Yarım tabak sebze, çeyrek tabak protein ve çeyrek tabak tam tahıl veya bakliyat">
              <div className="plate-disc">
                <div className="plate-label plate-vegetable"><strong>½</strong><span>Sebze</span></div>
                <div className="plate-label plate-protein"><strong>¼</strong><span>Protein</span></div>
                <div className="plate-label plate-grain"><strong>¼</strong><span>Tam tahıl</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="medical-section" id="guvenlik" aria-labelledby="medical-title">
          <div className="wide-container medical-layout">
            <div>
              <p className="eyebrow">ÖNEMLİ BİR NOT</p>
              <h2 id="medical-title">Önce sana<br /><em>göre ayarlansın.</em></h2>
            </div>
            <div className="medical-copy">
              <p>
                Bu sayfa tanı veya tedavi yerine geçmeyen genel bir örnek menüdür. Yaşın,
                kullandığın ilaçlar, kan şekeri ölçümlerin ve diğer sağlık durumların
                bilinmeden kişiye özel güvenli bir diyet hazırlanamaz.
              </p>
              <p>
                İnsülin ya da gliklazid / glimepirid gibi ilaçlar kullanıyorsan iki öğün
                arasındaki uzun açlık kan şekerini düşürebilir. Bu düzene başlamadan doktoruna
                veya diyetisyenine danış; ilaçlarını bu plana göre değiştirme. Böbrek sorunu
                veya ileri karaciğer hastalığın varsa ayrıca değerlendirme gerekir.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wide-container footer-inner">
          <div className="footer-brand">
            <span className="brand-name">denge<span>sofrası</span><b>.</b></span>
            <p>Sade, mevsimlik, sürdürülebilir.</p>
          </div>
          <div className="sources">
            <span>YARARLANILAN KAYNAKLAR</span>
            <a href="https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html" target="_blank" rel="noreferrer noopener">CDC, tabak yöntemi <ArrowUpRight size={14} /></a>
            <a href="https://easl.eu/publication/easl-easd-easo-clinical-practice-guidelines-managment-of-metabolic-dysfunction-associated-steatotic-liver-disease/" target="_blank" rel="noreferrer noopener">EASL, karaciğer rehberi <ArrowUpRight size={14} /></a>
            <a href="https://www.cdc.gov/diabetes/about/low-blood-sugar-hypoglycemia.html" target="_blank" rel="noreferrer noopener">CDC, düşük kan şekeri <ArrowUpRight size={14} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
