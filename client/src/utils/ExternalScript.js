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
                resolve(results);
            } else {
                results = 'error';
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