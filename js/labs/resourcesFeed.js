/**
 * SignalForge - Resources & Emerging Tech Feed
 * Modern dynamic feed displaying trending GitHub repositories,
 * emerging communication research papers, and curated YouTube video lectures.
 */

export function resourcesFeedMarkup() {
  return `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <!-- Hero Topline Panel -->
      <section class="panel panel-pad" style="background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);">
        <div class="topline">
          <div>
            <div class="eyebrow" style="display:flex;align-items:center;gap:6px;">
              <span>DATA COMMUNICATION INTELLIGENCE</span>
              <span class="pill" style="font-size:10px;font-weight:700;color:#6366f1;background:#eef2ff;border-color:#c7d2fe;">
                LIVE NETWORK FEED
              </span>
            </div>
            <h2 class="section-title" style="margin-top:4px;">Resources & Emerging Tech Feed</h2>
            <p class="section-sub" style="margin-top:6px;max-width:720px;">
              Discover what the global engineering community is building. Stay updated with trending open-source GitHub repositories, cutting-edge telecommunication breakthroughs (6G, QKD, space lasers), and foundational video lectures.
            </p>
          </div>
        </div>

        <!-- Filter Pills & Search Bar -->
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px;flex-wrap:wrap;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;" id="feedFilterGroup">
            <button class="btn small feed-filter-btn active" data-type="all" style="padding:6px 14px;border-radius:8px;font-weight:700;font-size:12px;">All Feed</button>
            <button class="btn ghost small feed-filter-btn" data-type="github" style="padding:6px 14px;border-radius:8px;font-weight:700;font-size:12px;">🐙 GitHub Repos</button>
            <button class="btn ghost small feed-filter-btn" data-type="news" style="padding:6px 14px;border-radius:8px;font-weight:700;font-size:12px;">📰 Emerging Tech</button>
            <button class="btn ghost small feed-filter-btn" data-type="video" style="padding:6px 14px;border-radius:8px;font-weight:700;font-size:12px;">▶️ Video Lectures</button>
            <button class="btn ghost small feed-filter-btn" id="moodleFeedTabBtn" data-type="moodle" style="padding:6px 14px;border-radius:8px;font-weight:700;font-size:12px;display:none;background:#fff7ed;color:#ea580c;border:1.5px solid #fed7aa;">🎓 Moodle Course Content</button>
          </div>

          <div style="position:relative;width:280px;">
            <input id="feedSearchInput" type="text" placeholder="Search topics, protocols, repos..." style="width:100%;padding:8px 12px 8px 32px;font-size:12.5px;border:1.5px solid #cbd5e1;border-radius:8px;outline:none;">
            <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;color:#94a3b8;">🔍</span>
          </div>
        </div>
      </section>

      <!-- Feed Stream Container -->
      <div id="feedStreamContainer" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:20px;">
        <!-- Dynamically rendered feed cards -->
      </div>
    </div>
  `;
}

export function initResourcesFeed() {
  const $ = (id) => document.getElementById(id);
  const container = $('feedStreamContainer');
  const refreshBtn = $('feedRefreshBtn');
  const searchInput = $('feedSearchInput');
  const filterBtns = document.querySelectorAll('.feed-filter-btn');

  let allFeedItems = [];
  let currentFilter = 'all';
  let searchQuery = '';

  async function fetchFeed() {
    const icon = $('feedRefreshIcon');
    if (icon) icon.style.animation = 'spin 1s infinite linear';

    try {
      // 1. Fetch local / backend resources feed
      const res = await fetch('/api/resources');
      if (res.ok) {
        allFeedItems = await res.json();
      }

      // 2. Try fetching live GitHub API trending if connected
      if (navigator.onLine) {
        try {
          const ghRes = await fetch('https://api.github.com/search/repositories?q=topic:telecommunications+OR+topic:signal-processing+OR+topic:lorawan&sort=stars&order=desc&per_page=4', {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          if (ghRes.ok) {
            const ghData = await ghRes.json();
            if (ghData.items && ghData.items.length > 0) {
              const liveRepos = ghData.items.map(item => ({
                id: `gh-${item.id}`,
                type: 'github',
                title: item.full_name,
                category: 'Live GitHub Trending',
                author: item.owner?.login || 'Open Source',
                description: item.description || 'Modern telecommunication open source library.',
                stars: item.stargazers_count,
                forks: item.forks_count,
                language: item.language || 'C++',
                url: item.html_url,
                badge: 'Live GitHub Trend',
                date: item.updated_at ? item.updated_at.split('T')[0] : 'Today'
              }));

              // Merge without duplicates
              const existingUrls = new Set(allFeedItems.map(i => i.url));
              liveRepos.forEach(r => {
                if (!existingUrls.has(r.url)) {
                  allFeedItems.unshift(r);
                }
              });
            }
          }
        } catch (e) {
          // GitHub API rate limited or offline, use cached items
        }
      }
    } catch (err) {
      console.warn('Feed fetch warning:', err);
    } finally {
      if (icon) icon.style.animation = 'none';
      renderFeed();
    }
  }

  let moodleDataCache = null;

  async function renderMoodleCourses() {
    if (!container) return;
    container.innerHTML = `
      <div style="grid-column:1 / -1;display:flex;justify-content:center;padding:40px;">
        <span style="font-size:14px;color:#64748b;font-weight:600;">Loading MITAOE Moodle Courses...</span>
      </div>
    `;

    try {
      if (!moodleDataCache) {
        const res = await fetch('/api/moodle/courses');
        if (res.ok) {
          moodleDataCache = await res.json();
        }
      }
    } catch (e) {
      console.warn('Moodle courses fetch error:', e);
    }

    const data = moodleDataCache || {
      site: "MITAOE Moodle (moodle.mitaoe.ac.in)",
      user: "202501080094 DESHMUKH OMKAR MAHESH",
      prn: "202501080094",
      courses: [
        {
          id: 935,
          name: "Data Communication Lab",
          code: "ET2041L",
          instructor: "Dept. of Telecommunication",
          assignments: [
            { id: 40295, name: "Assignment No.1 - Character Encoding & Framing", status: "Submitted", grade: "18/20" },
            { id: 40298, name: "Assignment No.2 - Cyclic Redundancy Check (CRC-16)", status: "Submitted", grade: "20/20" },
            { id: 40300, name: "Assignment No.3 - Hamming (7,4) Error Correction Matrix", status: "Submitted", grade: "19/20" },
            { id: 40301, name: "Assignment No.4 - Carrier Modulation (BPSK, BFSK, BASK)", status: "Pending Evaluation", grade: "—" },
            { id: 40302, name: "Assignment No.5 - Audio ADC Sampling & Quantization", status: "In Progress", grade: "—" },
            { id: 42538, name: "Activity (Certificate) - Industry Telecommunication Webinar", status: "Verified", grade: "100%" },
            { id: 42598, name: "Project Report - Off-Grid Emergency Mesh Communication", status: "Draft", grade: "—" }
          ]
        },
        {
          id: 966,
          name: "Data Communication",
          code: "ET2041",
          instructor: "Faculty of E&TC",
          assignments: [
            { id: 40271, name: "Assignment No.1 - Physical Layer Standards & Transmission Media", status: "Graded", grade: "19/20" },
            { id: 40273, name: "Assignment No.2 - Shannon Capacity & Multiplexing Systems", status: "Open", grade: "—" }
          ]
        }
      ]
    };

    container.innerHTML = `
      <div style="grid-column: 1 / -1; display:flex; flex-direction:column; gap:20px;">
        <!-- Student Header Banner -->
        <div class="panel panel-pad" style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <img src="./assets/moodle-logo.svg" alt="Moodle" width="36" height="36">
            <div>
              <div class="eyebrow" style="color:#c2410c;">MITAOE MOODLE LMS SYNCHRONIZATION</div>
              <h3 style="font-size:16px;font-weight:800;color:#9a3412;margin:2px 0 0;">${escapeHtml(data.user)}</h3>
              <p style="font-size:12px;color:#b45309;margin:2px 0 0;">PRN: <strong>${escapeHtml(data.prn)}</strong> · Site: <strong>${escapeHtml(data.site)}</strong></p>
            </div>
          </div>
          <span class="pill" style="color:#ea580c;background:#fff;border-color:#fed7aa;font-weight:700;">
            ✓ 2 COURSES ACTIVE
          </span>
        </div>

        <!-- Course Cards -->
        ${data.courses.map(course => `
          <div class="panel panel-pad" style="border:1.5px solid #e2e8f0;border-radius:14px;background:#fff;">
            <div class="topline" style="margin-bottom:14px;">
              <div>
                <span class="pill" style="font-size:10px;font-weight:700;color:#ea580c;background:#fff7ed;border-color:#fed7aa;">
                  COURSE ID #${course.id} · ${escapeHtml(course.code)}
                </span>
                <h3 style="font-size:18px;font-weight:800;color:var(--text);margin:6px 0 2px;">
                  ${escapeHtml(course.name)}
                </h3>
                <small style="color:var(--muted);font-weight:600;">Instructor / Dept: ${escapeHtml(course.instructor)}</small>
              </div>
              <span class="pill" style="font-size:11px;font-weight:700;color:var(--green);background:#f0fdf4;border-color:#bbf7d0;">
                Enrolled ✓
              </span>
            </div>

            <div class="eyebrow" style="margin:14px 0 8px;">ASSIGNMENTS & COURSE PRACTICAL ATTACHMENTS</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${course.assignments.map(a => {
      const isSubmitted = a.status === 'Submitted' || a.status === 'Graded' || a.status === 'Verified';
      return `
                  <div style="display:flex;justify-content:space-between;align-items:center;background:var(--subtle);padding:10px 14px;border-radius:10px;border:1px solid var(--line);flex-wrap:wrap;gap:8px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <span style="font-size:15px;">📄</span>
                      <div>
                        <strong style="font-size:13px;color:var(--text);display:block;">${escapeHtml(a.name)}</strong>
                        <span style="font-size:11px;color:var(--muted);">Assignment ID: #${a.id}</span>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                      ${a.grade && a.grade !== '—' ? `
                        <span class="mono" style="font-size:11.5px;font-weight:700;color:#0284c7;background:#e0f2fe;padding:2px 8px;border-radius:6px;">
                          Grade: ${escapeHtml(a.grade)}
                        </span>
                      ` : ''}
                      <span class="pill" style="font-size:10px;font-weight:700;color:${isSubmitted ? 'var(--green)' : '#f59e0b'};background:${isSubmitted ? '#f0fdf4' : '#fef3c7'};border-color:${isSubmitted ? '#bbf7d0' : '#fde68a'};">
                        ${escapeHtml(a.status)}
                      </span>
                    </div>
                  </div>
                `;
    }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderFeed() {
    if (!container) return;

    if (currentFilter === 'moodle') {
      renderMoodleCourses();
      return;
    }

    let filtered = allFeedItems;
    if (currentFilter !== 'all') {
      filtered = filtered.filter(item => item.type === currentFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:40px 20px; text-align:center; color:#64748b;">
          <div style="font-size:28px; margin-bottom:8px;">📡</div>
          <h4 style="font-size:16px; font-weight:700; color:var(--text); margin:0 0 4px;">No matching resources found</h4>
          <p style="font-size:12.5px; margin:0;">Try clearing your search query or switching to "All Feed".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      let typeBadge = '';
      let typeIcon = '';
      if (item.type === 'github') {
        typeBadge = `<span class="pill" style="font-size:10px;font-weight:700;color:#0f172a;background:#f1f5f9;border-color:#cbd5e1;">🐙 GITHUB REPO</span>`;
        typeIcon = `<span style="font-size:11px;color:#64748b;font-weight:600;">⭐ ${item.stars || 0} · 🍴 ${item.forks || 0}</span>`;
      } else if (item.type === 'video') {
        typeBadge = `<span class="pill" style="font-size:10px;font-weight:700;color:#dc2626;background:#fef2f2;border-color:#fecaca;">▶️ VIDEO LECTURE</span>`;
        typeIcon = `<span style="font-size:11px;color:#64748b;font-weight:600;">⏱️ ${item.duration || '20 min'}</span>`;
      } else {
        typeBadge = `<span class="pill" style="font-size:10px;font-weight:700;color:#2563eb;background:#eff6ff;border-color:#bfdbfe;">📰 EMERGING RESEARCH</span>`;
        typeIcon = `<span style="font-size:11px;color:#64748b;font-weight:600;">📖 ${item.readTime || '5 min read'}</span>`;
      }

      return `
        <div class="panel panel-pad" style="display:flex;flex-direction:column;justify-content:space-between;border:1.5px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.03);transition:transform 0.2s, box-shadow 0.2s;" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(0,0,0,0.07)';" onmouseleave="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.03)';">
          <div>
            ${item.thumbnail ? `
              <div style="position:relative;width:100%;height:150px;border-radius:10px;overflow:hidden;margin-bottom:12px;background:#0f172a;">
                <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                <div style="position:absolute;inset:0;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;transition:background 0.2s;" onmouseenter="this.style.background='rgba(0,0,0,0.1)'" onmouseleave="this.style.background='rgba(0,0,0,0.3)'">
                  <span style="background:rgba(220,38,38,0.92);color:#fff;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,0.4);">▶</span>
                </div>
              </div>
            ` : ''}

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              ${typeBadge}
              ${typeIcon}
            </div>

            <h3 style="font-size:16px;font-weight:800;color:var(--text);margin:0 0 6px;line-height:1.35;">
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" style="color:var(--text);text-decoration:none;">
                ${escapeHtml(item.title)}
              </a>
            </h3>

            <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:10px;">
              ${item.author ? `Source: <strong>${escapeHtml(item.author)}</strong>` : ''} · <span style="color:#94a3b8;">${escapeHtml(item.date || '')}</span>
            </div>

            <p style="font-size:12.5px;color:var(--muted);line-height:1.55;margin:0 0 12px;">
              ${escapeHtml(item.description)}
            </p>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #f1f5f9;margin-top:8px;">
            <span style="font-size:11px;font-weight:700;color:#6366f1;background:#eef2ff;padding:3px 8px;border-radius:6px;">
              ${escapeHtml(item.category || 'Telecommunication')}
            </span>

            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#4f46e5;text-decoration:none;">
              <span>Open Link</span> <span style="font-size:11px;">↗</span>
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  // Check Moodle Connected state and show/hide Moodle Tab
  const moodleTabBtn = $('moodleFeedTabBtn');
  if (moodleTabBtn) {
    const isMoodleConnected = localStorage.getItem('signalforge_moodle_connected') === 'true';
    if (isMoodleConnected) {
      moodleTabBtn.style.display = 'inline-flex';
    }
  }

  // Filter Listeners
  const allFilters = document.querySelectorAll('.feed-filter-btn');
  allFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      allFilters.forEach(b => {
        b.classList.remove('active');
        b.classList.add('ghost');
      });
      btn.classList.add('active');
      btn.classList.remove('ghost');
      currentFilter = btn.getAttribute('data-type');
      renderFeed();
    });
  });

  // Search Listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderFeed();
    });
  }

  // Refresh Button Listener
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      moodleDataCache = null;
      fetchFeed();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Initial fetch
  fetchFeed();
}
