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
                newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            }).catch(e => {
                console.error("COI Fetch Error:", e);
                return fetch(event.request);
            })
        );
    });
} else {
    (() => {
        const reloader = () => {
            console.log("COI: Service Worker registered, reloading page...");
            window.location.reload();
        };

        if ("serviceWorker" in navigator) {
            // Use the root path for the worker
            navigator.serviceWorker.register("/coi-serviceworker.js").then(
                (registration) => {
                    console.log("COI: Service Worker registered with scope:", registration.scope);

                    registration.addEventListener("updatefound", () => {
                        console.log("COI: New version found, reloading...");
                        reloader();
                    });

                    if (registration.active && !navigator.serviceWorker.controller) {
                        reloader();
                    }
                },
                (err) => {
                    console.error("COI: Service Worker registration failed:", err);
                }
            );
        }
    })();
}
