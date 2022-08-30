export const ExternalScript = (url) => {
    return new Promise((resolve, reject) => {
        let results = '';
        let script = document.querySelector(`script[src="${url}"]`);

        if (url) {
            results = 'loading';
        } else {
            results = 'idle';
            return;
        }
        const handleScript = (e) => {
            if (e.type === "load") {
                results = 'ready';
                script.removeEventListener("load", handleScript);
                script.removeEventListener("error", handleScript);
                resolve(results);
            } else {
                results = 'error';
                script.removeEventListener("load", handleScript);
                script.removeEventListener("error", handleScript);
                reject(results);
            }
        };

        if (!script) {
            script = document.createElement("script");
            script.type = "application/javascript";
            script.src = url;
            script.async = true;
            document.body.appendChild(script);
        }

        script.addEventListener("load", handleScript);
        script.addEventListener("error", handleScript);


    })
}