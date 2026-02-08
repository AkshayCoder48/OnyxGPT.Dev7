/*! coi-serviceworker v0.1.7 - MIT License - https://github.com/gzuidhof/coi-serviceworker */
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("fetch", (event) => {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }

        event.respondWith(
            fetch(event.request).then((response) => {
                if (response.status === 0) {
                    return response;
                }

                const newHeaders = new Headers(response.headers);
                newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            })
        );
    });
} else {
    (() => {
        const script = document.currentScript;
        const coepCustomHeader = script.getAttribute("coep") || "require-corp";
        const coopCustomHeader = script.getAttribute("coop") || "same-origin-allow-popups";

        if (window.crossOriginIsolated) return;

        if (window.isSecureContext && !!window.navigator.serviceWorker) {
            window.navigator.serviceWorker.register(window.document.currentScript.src).then((registration) => {
                console.log("COI Service Worker registered", registration.scope);

                registration.addEventListener("updatefound", () => {
                    console.log("Reloading page to enable COI");
                    window.location.reload();
                });

                if (registration.active && !window.navigator.serviceWorker.controller) {
                    console.log("Reloading page to enable COI");
                    window.location.reload();
                }
            }, (err) => {
                console.error("COI Service Worker registration failed: ", err);
            });
        }
    })();
}
