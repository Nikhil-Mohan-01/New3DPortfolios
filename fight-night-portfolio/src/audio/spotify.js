// Loads Spotify's official iFrame API once and creates embed controllers.
// Docs: https://developer.spotify.com/documentation/embeds/references/iframe-api
let apiPromise = null;

export function loadSpotifyApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    s.onerror = () => reject(new Error('Spotify iFrame API failed to load'));
    document.body.appendChild(s);
  });
  return apiPromise;
}

/** Create a visible docked embed and resolve with its controller. */
export async function createDock({ id, uri, width = 300, height = 80 }) {
  const api = await loadSpotifyApi();
  let dock = document.getElementById(id);
  if (!dock) {
    dock = document.createElement('div');
    dock.id = id;
    dock.className = 'spotify-dock';
    const mount = document.createElement('div');
    dock.appendChild(mount);
    document.body.appendChild(dock);
  }
  return new Promise((resolve) => {
    api.createController(dock.firstChild, { uri, width, height }, (controller) => resolve(controller));
  });
}
