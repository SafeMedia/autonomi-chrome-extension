export const isValidXorname = (input: string) => {
    const regex = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;
    return regex.test(input) && !input.includes("..");
};

export function convertWsToHttps(wsUrl: string): string | null {
    try {
        const urlObj = new URL(wsUrl);
        if (!["ws:", "wss:"].includes(urlObj.protocol)) return null;

        let hostname = urlObj.hostname.replace(/^ws\.|^wss\./, "");
        return `https://anttp.${hostname}`;
    } catch {
        return null;
    }
}
