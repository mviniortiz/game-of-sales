import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const URL = "https://vyzon.com.br";
const outDir = path.resolve("./scripts/mobile-audit-out");
fs.mkdirSync(outDir, { recursive: true });

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "pt-BR" });
    const page = await ctx.newPage();

    await page.goto(URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);

    const ctaBox = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button, a"));
        const cta = btns.find((b) => b.innerText?.trim() === "Agendar demonstração");
        if (!cta) return null;
        const r = cta.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, onClick: !!cta.onclick };
    });
    console.log("[CTA hero box]", ctaBox);

    console.log("[click CTA]");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button, a"));
        const cta = btns.find((b) => b.innerText?.trim() === "Agendar demonstração");
        cta?.click();
    });
    await page.waitForTimeout(2500);

    const afterClick = await page.evaluate(() => ({
        scrollY: window.scrollY,
        target: document.getElementById("agendar-demo")?.getBoundingClientRect().top,
    }));
    console.log("[after click]", afterClick);
    await page.screenshot({ path: path.join(outDir, "10-after-cta-click.png") });

    const firstInput = await page.evaluate(() => {
        const input = document.querySelector("#agendar-demo input");
        if (!input) return null;
        const r = input.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, name: input.name || input.placeholder };
    });
    console.log("[first input visible at]", firstInput);
    console.log("[viewport height]", page.viewportSize().height);

    const fromTopToFormDistance = firstInput ? firstInput.top : null;
    console.log("[distance from top of viewport to first input]", fromTopToFormDistance);

    await page.evaluate(() => {
        const input = document.querySelector("#agendar-demo input");
        input?.scrollIntoView({ block: "center", behavior: "instant" });
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "11-form-in-view.png") });

    const demoSectionHeight = await page.evaluate(() => {
        const s = document.getElementById("agendar-demo");
        return s?.getBoundingClientRect().height;
    });
    console.log("[agendar-demo section total height]", demoSectionHeight);

    const firstLogo = await page.evaluate(() => {
        const el = document.querySelector('img[alt*="Vyzon" i]');
        return el?.getBoundingClientRect().width;
    });
    console.log("[nav logo width]", firstLogo);

    await browser.close();
    console.log("done");
})();
