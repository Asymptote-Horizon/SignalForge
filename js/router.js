/**
 * SignalForge - Router Module
 * Handles client-side hash routing, route guard enforcement, screen activation,
 * and browser history (Back / Forward) navigation.
 */

export const VALID_ROUTES = [
  '#/login',
  '#/welcome',
  '#/pick',
  '#/tour',
  '#/tour-end',
  '#/profile',
  '#/lab/pipeline',
  '#/lab/media',
  '#/lab/network-diagnostic',
  '#/lab/wasm',
  '#/lab/projects',
  '#/lab/resources',
  '#/lab/other',
  '#/lab/signal',
  '#/lab/network',
  '#/lab/mux',
  '#/lab/basics',
  '#/syllabus'
];

export const ROUTE_SCREEN_MAP = {
  '#/login': 'screen-login',
  '#/welcome': 'screen-welcome',
  '#/pick': 'screen-pick',
  '#/tour': 'screen-tour',
  '#/tour-end': 'screen-tour-end',
  '#/profile': 'screen-dashboard',
  '#/lab/pipeline': 'screen-dashboard',
  '#/lab/media': 'screen-dashboard',
  '#/lab/network-diagnostic': 'screen-dashboard',
  '#/lab/wasm': 'screen-dashboard',
  '#/lab/projects': 'screen-dashboard',
  '#/lab/resources': 'screen-dashboard',
  '#/lab/other': 'screen-dashboard',
  '#/lab/signal': 'screen-dashboard',
  '#/lab/network': 'screen-dashboard',
  '#/lab/mux': 'screen-dashboard',
  '#/lab/basics': 'screen-dashboard',
  '#/syllabus': 'screen-dashboard'
};

class Router {
  constructor() {
    this.currentRoute = null;
    this.isAuthenticated = () => false;
    this.onRouteChange = () => {};
    this.beforeRouteLeave = () => {};
    this.isInitialized = false;
  }

  parseHash(hash = window.location.hash) {
    const raw = hash || '#/login';
    const [pathPart, queryPart] = raw.split('?');
    const query = {};
    if (queryPart) {
      const pairs = queryPart.split('&');
      for (const pair of pairs) {
        const [k, v] = pair.split('=');
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      }
    }
    return {
      raw,
      path: pathPart,
      query
    };
  }

  isValidRoute(path) {
    if (VALID_ROUTES.includes(path)) return true;
    if (path.startsWith('#/lab/')) return true;
    return false;
  }

  getCurrentRoute() {
    return this.parseHash();
  }

  navigate(newRoute) {
    if (window.location.hash === newRoute) {
      this.handleRoute();
    } else {
      window.location.hash = newRoute;
    }
  }

  handleRoute() {
    const routeInfo = this.parseHash();
    let targetPath = routeInfo.path;

    // Validate path against route whitelist
    if (!this.isValidRoute(targetPath)) {
      console.warn(`[SignalForge Router] Unknown route '${targetPath}', falling back.`);
      targetPath = this.isAuthenticated() ? '#/lab/pipeline' : '#/login';
      this.navigate(targetPath);
      return;
    }

    // Route Guard: enforce authentication
    const loggedIn = this.isAuthenticated();
    if (!loggedIn && targetPath !== '#/login') {
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
      targetPath = '#/login';
    } else if (loggedIn && targetPath === '#/login') {
      window.location.hash = '#/welcome';
      targetPath = '#/welcome';
    }

    // Call pre-navigation hook (to clear timers, pause animations)
    if (this.currentRoute && this.currentRoute.path !== targetPath) {
      try {
        this.beforeRouteLeave(this.currentRoute, targetPath);
      } catch (e) {
        console.warn('[SignalForge Router] beforeRouteLeave error:', e);
      }
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Toggle active screen container
    const screenId = ROUTE_SCREEN_MAP[targetPath] || (targetPath.startsWith('#/lab/') ? 'screen-dashboard' : 'screen-login');
    const screens = document.querySelectorAll('.screen');
    let activatedScreen = null;

    screens.forEach(s => {
      if (s.id === screenId) {
        s.classList.add('active');
        activatedScreen = s;
      } else {
        s.classList.remove('active');
      }
    });

    if (!activatedScreen) {
      console.error(`[SignalForge Router] Screen element #${screenId} not found in DOM!`);
    }

    // Header visibility: visible on post-login screens except tour
    const header = document.getElementById('appHeader');
    if (header) {
      const showHeader = loggedIn && targetPath !== '#/login' && targetPath !== '#/tour';
      header.classList.toggle('hidden', !showHeader);
    }

    // Dismiss syllabus modal when leaving #/syllabus
    if (targetPath !== '#/syllabus') {
      const modal = document.getElementById('sf-syllabus-modal');
      if (modal) modal.style.display = 'none';
    }

    this.currentRoute = { ...routeInfo, path: targetPath };

    // Fire application route change callback
    try {
      this.onRouteChange(this.currentRoute);
    } catch (err) {
      console.error('[SignalForge Router] onRouteChange handler error:', err);
    }
  }

  init(options = {}) {
    if (this.isInitialized) return;

    if (options.isAuthenticated) this.isAuthenticated = options.isAuthenticated;
    if (options.onRouteChange) this.onRouteChange = options.onRouteChange;
    if (options.beforeRouteLeave) this.beforeRouteLeave = options.beforeRouteLeave;

    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('popstate', () => this.handleRoute());

    this.isInitialized = true;
    this.handleRoute();
  }
}

export const router = new Router();
