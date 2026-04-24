const APP_URL = "https://soknadbasen.no";

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");

async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["authToken"], (r) => resolve(r.authToken ?? null));
  });
}

async function getJobInfoFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { title: "", company: "", url: tab?.url ?? "", source: "" };

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Try to get job info from common job sites
        const url = window.location.href;
        const hostname = window.location.hostname.replace("www.", "");

        let title = "";
        let company = "";

        // LinkedIn
        if (hostname === "linkedin.com") {
          title =
            document.querySelector(".job-details-jobs-unified-top-card__job-title h1")?.textContent?.trim() ||
            document.querySelector("h1.t-24")?.textContent?.trim() ||
            "";
          company =
            document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.textContent?.trim() ||
            document.querySelector(".topcard__org-name-link")?.textContent?.trim() ||
            "";
        }

        // FINN.no
        if (hostname === "finn.no") {
          title =
            document.querySelector("h1.u-t3")?.textContent?.trim() ||
            document.querySelector("h1[data-testid='ad-heading']")?.textContent?.trim() ||
            document.querySelector("h1")?.textContent?.trim() ||
            "";
          company =
            document.querySelector("[data-testid='employer-name']")?.textContent?.trim() ||
            document.querySelector(".u-muted")?.textContent?.trim() ||
            "";
        }

        // Arbeidsplassen (NAV)
        if (hostname === "arbeidsplassen.nav.no") {
          title = document.querySelector("h1")?.textContent?.trim() || "";
          company = document.querySelector(".employer-name, .company-name")?.textContent?.trim() || "";
        }

        // Fallback: page title
        if (!title) {
          const pageTitle = document.title;
          title = pageTitle.split(" - ")[0]?.split(" | ")[0]?.trim() || "";
        }

        return { title, company, url, hostname };
      },
    });

    const info = result.result;
    return {
      title: info.title,
      company: info.company,
      url: info.url,
      source: info.hostname,
    };
  } catch {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return { title: "", company: "", url: tab?.url ?? "", source: "" };
  }
}

async function init() {
  hide("loading");

  const token = await getAuthToken();
  if (!token) {
    // Try to get token from the app's cookies via message
    show("login-required");
    return;
  }

  const info = await getJobInfoFromTab();

  $("title").value = info.title;
  $("company").value = info.company;
  $("source").value = info.source;

  show("form-view");

  $("add-btn").addEventListener("click", async () => {
    const title = $("title").value.trim();
    const company = $("company").value.trim();
    const source = $("source").value.trim();

    if (!title || !company) {
      show("error");
      $("error").textContent = "Stillingstittel og selskap er påkrevd.";
      $("error").classList.remove("hidden");
      return;
    }

    $("add-btn").disabled = true;
    $("add-btn").textContent = "Legger til …";
    $("error").classList.add("hidden");

    try {
      const res = await fetch(`${APP_URL}/api/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          companyName: company,
          source,
          jobUrl: info.url,
          status: "draft",
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Feil ${res.status}`);
      }

      hide("form-view");
      show("success-view");
    } catch (err) {
      $("add-btn").disabled = false;
      $("add-btn").textContent = "Legg til i pipeline";
      $("error").textContent = err.message || "Noe gikk galt. Prøv igjen.";
      $("error").classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
