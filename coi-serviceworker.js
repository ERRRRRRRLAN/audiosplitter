<<<<<<< HEAD
// Source: https://github.com/gzuidhof/coi-serviceworker
// This script enables Cross-Origin-Isolation for GitHub Pages
// Required for SharedArrayBuffer support in FFmpeg.wasm

/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (!ev.data) {
            return;
        } else if (ev.data.type === "deregister") {
            self.registration
                .unregister()
                .then(() => {
                    return self.clients.matchAll();
                })
                .then(clients => {
                    clients.forEach((client) => client.navigate(client.url));
                });
        } else if (ev.data.type === "coepCredentialless") {
            coepCredentialless = ev.data.value;
        }
    });

    self.addEventListener("fetch", function (event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
            return;
        }

        const request = (coepCredentialless && r.mode === "no-cors")
            ? new Request(r, {
                credentials: "omit",
            })
            : r;
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });

} else {
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");
        const coepDegrading = (reloadedBySelf == "coepdegrade");

        const encodedCurrentUrl = encodeURIComponent(location.href);

        const hasReloadLoop = window.sessionStorage.getItem("coiReloadLoop");
        if (hasReloadLoop) {
            console.log("Detected a reload loop, disabling COI service worker.");
            return;
        }

        if (!navigator.serviceWorker) {
            console.warn("Service workers are not supported.");
            return;
        }

        const coepCredentialless = !coepDegrading && (window.crossOriginIsolated !== undefined);

        navigator.serviceWorker
            .register(window.document.currentScript.src)
            .then(
                (registration) => {
                    registration.active?.postMessage({
                        type: "coepCredentialless",
                        value: coepCredentialless,
                    });

                    if (!window.crossOriginIsolated && !hasReloadLoop) {
                        window.sessionStorage.setItem("coiReloadedBySelf", "1");
                        window.sessionStorage.setItem("coiReloadLoop", "1");
                        setTimeout(() => {
                            window.sessionStorage.removeItem("coiReloadLoop");
                        }, 5000);
                        window.location.reload();
                    }
                },
                (err) => {
                    console.error("Service worker initialization error:", err);
                }
            );
    })();
}
=======
// Source: https://github.com/gzuidhof/coi-serviceworker
// This script enables Cross-Origin-Isolation for GitHub Pages
// Required for SharedArrayBuffer support in FFmpeg.wasm

/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (!ev.data) {
            return;
        } else if (ev.data.type === "deregister") {
            self.registration
                .unregister()
                .then(() => {
                    return self.clients.matchAll();
                })
                .then(clients => {
                    clients.forEach((client) => client.navigate(client.url));
                });
        } else if (ev.data.type === "coepCredentialless") {
            coepCredentialless = ev.data.value;
        }
    });

    self.addEventListener("fetch", function (event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
            return;
        }

        const request = (coepCredentialless && r.mode === "no-cors")
            ? new Request(r, {
                credentials: "omit",
            })
            : r;
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });

} else {
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");
        const coepDegrading = (reloadedBySelf == "coepdegrade");

        const encodedCurrentUrl = encodeURIComponent(location.href);

        const hasReloadLoop = window.sessionStorage.getItem("coiReloadLoop");
        if (hasReloadLoop) {
            console.log("Detected a reload loop, disabling COI service worker.");
            return;
        }

        if (!navigator.serviceWorker) {
            console.warn("Service workers are not supported.");
            return;
        }

        const coepCredentialless = !coepDegrading && (window.crossOriginIsolated !== undefined);

        navigator.serviceWorker
            .register(window.document.currentScript.src)
            .then(
                (registration) => {
                    registration.active?.postMessage({
                        type: "coepCredentialless",
                        value: coepCredentialless,
                    });

                    if (!window.crossOriginIsolated && !hasReloadLoop) {
                        window.sessionStorage.setItem("coiReloadedBySelf", "1");
                        window.sessionStorage.setItem("coiReloadLoop", "1");
                        setTimeout(() => {
                            window.sessionStorage.removeItem("coiReloadLoop");
                        }, 5000);
                        window.location.reload();
                    }
                },
                (err) => {
                    console.error("Service worker initialization error:", err);
                }
            );
    })();
}
>>>>>>> d8c60934bc3b96853dbe2a90f6a64b80ad11b605
