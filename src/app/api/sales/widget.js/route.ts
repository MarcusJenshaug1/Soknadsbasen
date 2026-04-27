/// Hosted vanilla-JS widget for embed på kunder sin nettside.
/// Embedded med <script src="https://soknadsbasen.no/api/sales/widget.js">.
/// Mounter på div#soknadsbasen-form og posterer til /api/sales/web-form.

const WIDGET_JS = String.raw`(function () {
  var SCRIPT = document.currentScript;
  var THEME = (SCRIPT && SCRIPT.dataset && SCRIPT.dataset.theme) || "light";
  var ENDPOINT = (SCRIPT && SCRIPT.src) ? SCRIPT.src.replace(/\/api\/sales\/widget\.js.*$/, "/api/sales/web-form") : "/api/sales/web-form";
  var TARGET = document.getElementById("soknadsbasen-form");
  if (!TARGET) {
    console.warn("[soknadsbasen] mangler <div id=\"soknadsbasen-form\"></div>");
    return;
  }
  var dark = THEME === "dark";
  var bg = dark ? "#1e1b18" : "#ffffff";
  var ink = dark ? "#f0ece6" : "#14110e";
  var muted = dark ? "rgba(240,236,230,0.55)" : "rgba(20,17,14,0.55)";
  var border = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  var accent = "#D5592E";

  var fontStack = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  var inputStyle = "width:100%;padding:10px 12px;border-radius:8px;border:1px solid " + border + ";background:" + bg + ";color:" + ink + ";font-size:13px;font-family:" + fontStack + ";outline:none;box-sizing:border-box;";

  function field(name, label, type, required, ph) {
    var html = '<label style="display:block;margin-bottom:10px;">';
    html += '<span style="display:block;font-size:11px;color:' + muted + ';margin-bottom:4px;">' + label + (required ? " *" : "") + '</span>';
    if (type === "textarea") {
      html += '<textarea name="' + name + '" rows="3" placeholder="' + (ph || "") + '" style="' + inputStyle + 'resize:vertical;"></textarea>';
    } else {
      html += '<input type="' + type + '" name="' + name + '" ' + (required ? "required" : "") + ' placeholder="' + (ph || "") + '" style="' + inputStyle + '" />';
    }
    html += '</label>';
    return html;
  }

  TARGET.innerHTML =
    '<div id="sb-card" style="background:' + bg + ';color:' + ink + ';font-family:' + fontStack + ';padding:24px;border-radius:16px;border:1px solid ' + border + ';max-width:420px;">' +
      '<h3 style="margin:0 0 6px;font-size:18px;font-weight:600;">Kontakt oss</h3>' +
      '<p style="margin:0 0 16px;font-size:12px;color:' + muted + ';">Vi tar kontakt innen 24 timer.</p>' +
      '<form id="sb-form">' +
        field("companyName", "Bedrift", "text", true) +
        field("contactName", "Ditt navn", "text", true) +
        field("email", "E-post", "email", true) +
        field("phone", "Telefon", "tel", false) +
        field("message", "Hvor mange ansatte har dere?", "textarea", false) +
        '<input type="text" name="website_url" tabindex="-1" autocomplete="off" style="position:absolute;left:-10000px;" />' +
        '<button type="submit" id="sb-submit" style="width:100%;padding:11px 14px;border-radius:8px;border:0;background:' + accent + ';color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:' + fontStack + ';">Send forespørsel</button>' +
        '<p id="sb-msg" style="margin:10px 0 0;font-size:11px;color:' + muted + ';min-height:14px;"></p>' +
      '</form>' +
    '</div>';

  var form = document.getElementById("sb-form");
  var btn = document.getElementById("sb-submit");
  var msg = document.getElementById("sb-msg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    btn.disabled = true;
    btn.textContent = "Sender…";
    msg.textContent = "";
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function () {
        TARGET.innerHTML = '<div style="background:' + bg + ';color:' + ink + ';font-family:' + fontStack + ';padding:32px;border-radius:16px;border:1px solid ' + border + ';max-width:420px;text-align:center;">' +
          '<div style="width:48px;height:48px;border-radius:50%;background:#10B981;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:24px;">✓</div>' +
          '<h3 style="margin:0 0 6px;font-size:16px;font-weight:600;">Takk!</h3>' +
          '<p style="margin:0;font-size:12px;color:' + muted + ';">Vi tar kontakt innen 24 timer.</p>' +
        '</div>';
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = "Send forespørsel";
        msg.textContent = "Noe gikk galt. Prøv igjen.";
        msg.style.color = "#DC2626";
      });
  });
})();`;

export const runtime = "nodejs";

export async function GET() {
  return new Response(WIDGET_JS, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
