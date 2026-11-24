/**
 * SignalForge - Student Projects Gallery
 * Interactive 3D flip cards, live project submissions,
 * and persistent public peer/faculty Q&A discussion threads.
 */

export function projectsGalleryMarkup() {
  return `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <!-- Header Banner & Action Bar -->
      <section class="panel panel-pad" style="background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);">
        <div class="topline">
          <div>
            <div class="eyebrow" style="display:flex;align-items:center;gap:6px;">
              <span>STUDENT INNOVATION HUB</span>
              <span class="pill" style="font-size:10px;font-weight:700;color:#10b981;background:#f0fdf4;border-color:#bbf7d0;">
                PEER REVIEW & Q&A
              </span>
            </div>
            <h2 class="section-title" style="margin-top:4px;">Telecommunication Project Showcase</h2>
            <p class="section-sub" style="margin-top:6px;max-width:700px;">
              Explore interactive projects designed by engineering students. Click any card to flip and inspect full hardware architectures, or join the public discussion forum to ask technical questions directly to the student authors.
            </p>
          </div>

          <button class="btn small" id="projOpenSubmitModalBtn" style="padding:9px 16px;background:#4f46e5;color:#fff;border-radius:10px;font-weight:700;display:flex;align-items:center;gap:8px;">
            <span>+ Submit Your Project</span>
          </button>
        </div>
      </section>

      <!-- 3D Flip Card Gallery Grid -->
      <div id="projectsGrid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:24px;">
        <!-- Rendered dynamically from backend /api/projects -->
      </div>

      <!-- Public Q&A Discussion Modal -->
      <div id="sf-proj-qa-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#fff;border-radius:16px;max-width:640px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,0.25);overflow:hidden;border:1px solid #e2e8f0;">
          <!-- Modal Header -->
          <div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;">
            <div>
              <div class="eyebrow" style="color:#6366f1;">PUBLIC TECHNICAL Q&A</div>
              <h3 id="modalProjTitle" style="font-size:16px;font-weight:800;color:var(--text);margin:2px 0 0;">Project Discussion</h3>
            </div>
            <button id="closeProjQaModal" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;padding:4px 8px;">✕</button>
          </div>

          <!-- Q&A Thread Body -->
          <div id="modalProjQaList" style="flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
            <!-- Threads inserted dynamically -->
          </div>

          <!-- Post New Question Form -->
          <div style="padding:16px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;">
            <div style="display:flex;gap:10px;margin-bottom:8px;">
              <input id="qaAuthorInput" type="text" placeholder="Your Name (e.g. Omkar Deshmukh)" style="width:200px;padding:8px 12px;font-size:12.5px;border:1.5px solid #cbd5e1;border-radius:8px;">
              <input id="qaMsgInput" type="text" placeholder="Ask a question about their hardware, protocol, or algorithms..." style="flex:1;padding:8px 12px;font-size:12.5px;border:1.5px solid #cbd5e1;border-radius:8px;">
              <button id="qaSubmitBtn" class="btn small" style="background:#4f46e5;color:#fff;border-radius:8px;font-weight:700;">Ask</button>
            </div>
            <small style="color:#64748b;font-size:11px;">All questions and author responses are publicly visible to students and faculty.</small>
          </div>
        </div>
      </div>

      <!-- Submit Project Modal -->
      <div id="sf-proj-submit-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#fff;border-radius:16px;max-width:580px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,0.25);overflow:hidden;border:1px solid #e2e8f0;">
          <div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;">
            <div>
              <div class="eyebrow" style="color:#6366f1;">CONTRIBUTE TO SIGNALFORGE</div>
              <h3 style="font-size:16px;font-weight:800;color:var(--text);margin:2px 0 0;">Submit Student Project</h3>
            </div>
            <button id="closeProjSubmitModal" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;padding:4px 8px;">✕</button>
          </div>

          <form id="newProjectForm" style="flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;">Project Title *</label>
              <input id="subProjTitle" required placeholder="e.g. Cognitive Radio Spectrum Sensing with SDR" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;">Author / Team Name *</label>
                <input id="subProjAuthor" required placeholder="e.g. Omkar Deshmukh & Lab Team" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;">
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;">Category *</label>
                <select id="subProjCategory" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#fff;">
                  <option value="Emergency & Mesh Networks">Emergency & Mesh Networks</option>
                  <option value="Network Simulation & DSP">Network Simulation & DSP</option>
                  <option value="Software Defined Radio">Software Defined Radio (SDR)</option>
                  <option value="Optical & Satellite Comms">Optical & Satellite Comms</option>
                  <option value="Wireless IoT Protocols">Wireless IoT Protocols</option>
                </select>
              </div>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;">Short Summary (Abstract) *</label>
              <textarea id="subProjSummary" required rows="2" placeholder="Briefly explain what problem your communication system solves..." style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;resize:vertical;"></textarea>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;">Hardware & Protocol Architecture *</label>
              <textarea id="subProjArch" required rows="3" placeholder="e.g. Hardware used (ESP32, SX1278, HackRF), modulation schemes, packet formatting, FEC..." style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;resize:vertical;"></textarea>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;">GitHub Repository Link</label>
                <input id="subProjGithub" type="url" placeholder="https://github.com/..." style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;">
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;">Live Demo Link</label>
                <input id="subProjDemo" placeholder="#/lab/pipeline" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;">
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
              <button type="button" id="subCancelBtn" class="btn ghost small" style="padding:9px 16px;">Cancel</button>
              <button type="submit" class="btn small" style="padding:9px 18px;background:#4f46e5;color:#fff;border-radius:8px;font-weight:700;">Publish Project Card</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

export function initProjectsGallery() {
  const $ = (id) => document.getElementById(id);
  const grid = $('projectsGrid');
  let currentProjects = [];
  let activeQaProjectId = null;

  // Load Projects from Backend
  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        currentProjects = await res.json();
      }
    } catch (e) {
      console.warn('Backend loadProjects failed, using local cache:', e);
      // Fallback local projects
      currentProjects = [
        {
          id: 'proj-disaster-mgmt',
          title: 'Disaster Management Text Sending',
          author: 'Preet Tank, Vansh Thakur, Tejas Waghmode',
          category: 'Emergency & Mesh Networks',
          tags: ['LoRa', 'C++', 'AES-128', 'Mesh'],
          summary: 'Off-grid resilient emergency SMS transmission protocol using 433/868 MHz LoRa modules to transmit critical SOS packets when cellular towers collapse during natural disasters.',
          architecture: 'Hardware: ESP32 + SX1278 LoRa. Protocol: C++ embedded firmware with CSMA/CA backoff, AES-128 payload encryption, and hop-by-hop packet deduplication.',
          githubUrl: 'https://github.com',
          demoUrl: '#/lab/pipeline',
          likes: 28,
          discussions: []
        },
        {
          id: 'proj-mesh-viz',
          title: 'Mesh Network Visualization',
          author: 'Shreyas Khabale, Omkar Deshmukh',
          category: 'Network Simulation & DSP',
          tags: ['WebAssembly', 'Dijkstra', 'Topology', 'Routing'],
          summary: 'Real-time interactive ad-hoc mesh networking simulator demonstrating dynamic routing path discovery, link latency variations, and automatic self-healing.',
          architecture: 'Canvas 2D + WebAssembly routing engine. Models node energy levels, signal degradation with distance (Friis equation), and dynamic rerouting via Bellman-Ford.',
          githubUrl: 'https://github.com',
          demoUrl: '#/lab/network-diagnostic',
          likes: 34,
          discussions: []
        }
      ];
    }
    renderCards();
  }

  // Render 3D Flip Cards
  function renderCards() {
    if (!grid) return;
    grid.innerHTML = currentProjects.map((p, idx) => {
      const discCount = (p.discussions || []).length;
      return `
        <div class="sf-flip-card-wrapper" style="perspective:1000px;min-height:360px;">
          <div class="sf-flip-card-inner" id="card_inner_${p.id}" style="position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);">
            
            <!-- CARD FRONT -->
            <div class="panel panel-pad sf-card-face sf-card-front" style="position:absolute;inset:0;backface-visibility:hidden;display:flex;flex-direction:column;justify-content:space-between;border:1.5px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,0.04);">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                  <span class="pill" style="font-size:10px;font-weight:700;color:#6366f1;background:#eef2ff;border-color:#c7d2fe;">
                    ${escapeHtml(p.category || 'Data Communication')}
                  </span>
                  <button class="btn ghost small like-btn" data-id="${p.id}" style="padding:2px 8px;font-size:11.5px;color:#e11d48;font-weight:700;display:flex;align-items:center;gap:4px;border:1px solid #fecdd3;border-radius:6px;background:#fff1f2;cursor:pointer;">
                    <span>❤️</span> <span id="likes_${p.id}">${p.likes || 1}</span>
                  </button>
                </div>

                <h3 style="font-size:18px;font-weight:800;color:var(--text);margin:0 0 6px;line-height:1.3;">
                  ${escapeHtml(p.title)}
                </h3>

                <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:12px;">
                  By <strong>${escapeHtml(p.author)}</strong>
                </div>

                <p style="font-size:12.5px;color:var(--muted);line-height:1.55;margin:0 0 14px;">
                  ${escapeHtml(p.summary)}
                </p>

                <!-- Tags -->
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
                  ${(p.tags || []).map(t => `<span style="background:#f1f5f9;color:#334155;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;">#${escapeHtml(t)}</span>`).join('')}
                </div>
              </div>

              <!-- Action Bar -->
              <div style="display:flex;gap:8px;align-items:center;padding-top:12px;border-top:1px solid #f1f5f9;">
                <button class="btn ghost small flip-btn" data-id="${p.id}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;font-weight:700;font-size:11.5px;">
                  <span>Flip Details ↻</span>
                </button>
                <button class="btn small qa-btn" data-id="${p.id}" style="background:#4f46e5;color:#fff;display:flex;align-items:center;gap:6px;font-weight:700;font-size:11.5px;padding:7px 12px;border-radius:8px;">
                  <span>💬 Q&A (${discCount})</span>
                </button>
              </div>
            </div>

            <!-- CARD BACK -->
            <div class="panel panel-pad sf-card-face sf-card-back" style="position:absolute;inset:0;backface-visibility:hidden;transform:rotateY(180deg);display:flex;flex-direction:column;justify-content:space-between;border:1.5px solid #cbd5e1;border-radius:14px;background:#f8fafc;box-shadow:0 8px 20px rgba(0,0,0,0.06);">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <span class="pill" style="font-size:10px;font-weight:700;color:#0f766e;background:#f0fdfa;border-color:#99f6e4;">
                    SYSTEM ARCHITECTURE
                  </span>
                  <button class="btn ghost small flip-btn" data-id="${p.id}" style="padding:2px 8px;font-size:11px;">
                    ↺ Back
                  </button>
                </div>

                <h4 style="font-size:15px;font-weight:800;color:var(--text);margin:0 0 8px;">
                  ${escapeHtml(p.title)}
                </h4>

                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;font-size:12px;line-height:1.6;color:#334155;margin-bottom:12px;">
                  <strong>Hardware & Protocol Stack:</strong><br>
                  ${escapeHtml(p.architecture || 'Embedded firmware and transceiver architecture.')}
                </div>

                <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;">
                  ${p.githubUrl ? `<div>📁 <strong>GitHub:</strong> <a href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener" style="color:#4f46e5;text-decoration:none;font-weight:600;">View Repository ↗</a></div>` : ''}
                  ${p.demoUrl ? `<div>🚀 <strong>Live Demo:</strong> <a href="${escapeHtml(p.demoUrl)}" style="color:#10b981;text-decoration:none;font-weight:600;">Launch Simulation ↗</a></div>` : ''}
                </div>
              </div>

              <!-- Back Action Bar -->
              <div style="display:flex;gap:8px;align-items:center;padding-top:12px;border-top:1px solid #e2e8f0;">
                <button class="btn small qa-btn" data-id="${p.id}" style="flex:1;background:#4f46e5;color:#fff;font-weight:700;font-size:11.5px;padding:7px 12px;border-radius:8px;">
                  <span>💬 Ask Question / Discuss (${discCount})</span>
                </button>
                <button class="btn ghost small flip-btn" data-id="${p.id}" style="padding:7px 12px;font-size:11.5px;font-weight:700;">
                  <span>↺ Flip</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      `;
    }).join('');

    // Attach Flip Listeners
    grid.querySelectorAll('.flip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const inner = $(`card_inner_${id}`);
        if (inner) {
          const isFlipped = inner.style.transform === 'rotateY(180deg)';
          inner.style.transform = isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)';
        }
      });
    });

    // Attach Like Listeners
    grid.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const countSpan = $(`likes_${id}`);
        if (countSpan) {
          countSpan.textContent = Number(countSpan.textContent || 0) + 1;
        }
        try {
          const res = await fetch('/api/projects/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: id })
          });
          if (res.ok) {
            const data = await res.json();
            if (countSpan && data.likes) countSpan.textContent = data.likes;
          }
        } catch (err) {
          console.warn('Like fallback:', err);
        }
      });
    });

    // Attach Q&A Listeners
    grid.querySelectorAll('.qa-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openQaModal(id);
      });
    });
  }

  // Open Q&A Modal for a project
  function openQaModal(projectId) {
    activeQaProjectId = projectId;
    const proj = currentProjects.find(p => p.id === projectId);
    if (!proj) return;

    $('modalProjTitle').textContent = `Q&A: ${proj.title}`;
    renderQaThread(proj);
    $('sf-proj-qa-modal').style.display = 'flex';
  }

  function renderQaThread(proj) {
    const list = $('modalProjQaList');
    if (!list) return;

    const discussions = proj.discussions || [];
    if (discussions.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:30px 10px;color:#64748b;font-size:13px;">
          No public questions yet. Be the first to ask ${escapeHtml(proj.author)} about their project!
        </div>
      `;
      return;
    }

    list.innerHTML = discussions.map(d => `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <span style="width:28px;height:28px;border-radius:50%;background:#e0e7ff;color:#4338ca;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;">
            ${escapeHtml(d.avatar || 'U')}
          </span>
          <div>
            <strong style="font-size:12.5px;color:var(--text);">${escapeHtml(d.author)}</strong>
            <small style="color:#94a3b8;font-size:11px;margin-left:6px;">${escapeHtml(d.date || '')}</small>
          </div>
        </div>
        <p style="font-size:13px;color:var(--text);margin:0 0 10px;line-height:1.5;">
          ${escapeHtml(d.message)}
        </p>

        <!-- Replies -->
        ${(d.replies || []).map(r => `
          <div style="margin-left:24px;border-left:2.5px solid #6366f1;padding-left:12px;margin-top:8px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <strong style="font-size:12px;color:#4338ca;">${escapeHtml(r.author)}</strong>
              <small style="color:#94a3b8;font-size:10.5px;">${escapeHtml(r.date || '')}</small>
            </div>
            <p style="font-size:12.5px;color:#334155;margin:2px 0 0;line-height:1.45;">
              ${escapeHtml(r.message)}
            </p>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // Handle Q&A Submit
  $('qaSubmitBtn').addEventListener('click', async () => {
    const author = $('qaAuthorInput').value.trim() || 'Student';
    const message = $('qaMsgInput').value.trim();
    if (!message || !activeQaProjectId) return;

    try {
      const res = await fetch('/api/projects/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeQaProjectId,
          author,
          message
        })
      });
      if (res.ok) {
        const data = await res.json();
        currentProjects = data.projects;
        const updatedProj = currentProjects.find(p => p.id === activeQaProjectId);
        if (updatedProj) renderQaThread(updatedProj);
        $('qaMsgInput').value = '';
        renderCards();
      }
    } catch (e) {
      console.warn('Post discussion error:', e);
    }
  });

  // Modal Closers
  $('closeProjQaModal').addEventListener('click', () => {
    $('sf-proj-qa-modal').style.display = 'none';
  });

  $('projOpenSubmitModalBtn').addEventListener('click', () => {
    $('sf-proj-submit-modal').style.display = 'flex';
  });

  $('closeProjSubmitModal').addEventListener('click', () => {
    $('sf-proj-submit-modal').style.display = 'none';
  });

  $('subCancelBtn').addEventListener('click', () => {
    $('sf-proj-submit-modal').style.display = 'none';
  });

  // Handle New Project Submission
  $('newProjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: $('subProjTitle').value.trim(),
      author: $('subProjAuthor').value.trim(),
      category: $('subProjCategory').value,
      summary: $('subProjSummary').value.trim(),
      architecture: $('subProjArch').value.trim(),
      githubUrl: $('subProjGithub').value.trim() || 'https://github.com',
      demoUrl: $('subProjDemo').value.trim() || '#/lab/pipeline',
      tags: [$('subProjCategory').value.split(' ')[0], 'C++', 'DataComm']
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        $('sf-proj-submit-modal').style.display = 'none';
        $('newProjectForm').reset();
        await loadProjects();
      }
    } catch (err) {
      console.warn('Failed to submit project:', err);
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Initial fetch
  loadProjects();
}
