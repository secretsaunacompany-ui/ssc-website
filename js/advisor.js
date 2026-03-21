/**
 * Secret Sauna Company - Advisor Module
 * Inline AI advisors embedded in page sections.
 * Initializes from data-advisor-* attributes on container elements.
 */
(function() {
  'use strict';

  const ENDPOINT = '/.netlify/functions/advisor';

  // ============================================
  // Advisor Instance
  // ============================================
  class Advisor {
    constructor(container) {
      this.container = container;
      this.type = container.dataset.advisorType;
      this.placeholder = container.dataset.advisorPlaceholder || 'Ask a question';
      this.multiTurn = container.dataset.advisorMultiTurn === 'true';
      this.history = [];
      this.loading = false;

      this.render();
      this.bindEvents();
    }

    render() {
      // Parse suggested prompts from data attribute
      const startersRaw = this.container.dataset.advisorStarters;
      const starters = startersRaw ? JSON.parse(startersRaw) : [];

      this.container.innerHTML = '';
      this.container.classList.add('advisor');

      // Starters
      if (starters.length > 0) {
        const startersEl = document.createElement('div');
        startersEl.className = 'advisor__starters';
        starters.forEach(text => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'advisor__starter';
          btn.textContent = text;
          btn.addEventListener('click', () => this.submit(text));
          startersEl.appendChild(btn);
        });
        this.container.appendChild(startersEl);
      }

      // Input row
      const inputRow = document.createElement('div');
      inputRow.className = 'advisor__input-row';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'advisor__input';
      input.placeholder = this.placeholder;
      input.autocomplete = 'off';

      const submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'advisor__submit';
      submitBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>';
      submitBtn.title = 'Send';

      inputRow.appendChild(input);
      inputRow.appendChild(submitBtn);
      this.container.appendChild(inputRow);

      // Response area (hidden initially)
      const response = document.createElement('div');
      response.className = 'advisor__response';
      response.style.display = 'none';
      this.container.appendChild(response);

      // Disclaimer
      const disclaimer = document.createElement('p');
      disclaimer.className = 'advisor__disclaimer';
      disclaimer.textContent = 'Responses are generated automatically. For specific guidance, contact us directly.';
      this.container.appendChild(disclaimer);

      // Store references
      this.inputEl = input;
      this.submitBtn = submitBtn;
      this.responseEl = response;
      this.startersEl = this.container.querySelector('.advisor__starters');
    }

    bindEvents() {
      this.submitBtn.addEventListener('click', () => {
        const msg = this.inputEl.value.trim();
        if (msg) this.submit(msg);
      });

      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const msg = this.inputEl.value.trim();
          if (msg) this.submit(msg);
        }
      });
    }

    async submit(message) {
      if (this.loading) return;

      this.loading = true;
      this.inputEl.value = '';
      this.inputEl.disabled = true;
      this.submitBtn.disabled = true;

      // Hide starters after first interaction
      if (this.startersEl) {
        this.startersEl.style.display = 'none';
      }

      // Show response area with loading state
      this.responseEl.style.display = 'block';
      this.showLoading();

      // Track analytics event
      this.trackEvent('advisor_submit', { type: this.type });

      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: this.type,
            message: message,
            history: this.multiTurn ? this.history : []
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Request failed');
        }

        const data = await res.json();
        const responseText = data.response;

        // Update conversation history for multi-turn
        if (this.multiTurn) {
          this.history.push(
            { role: 'user', content: message },
            { role: 'assistant', content: responseText }
          );
        }

        // Display response
        this.showResponse(message, responseText);
        this.trackEvent('advisor_complete', { type: this.type });

      } catch (err) {
        console.error('Advisor error:', err);
        this.showError(err.message);
      } finally {
        this.loading = false;
        this.inputEl.disabled = false;
        this.submitBtn.disabled = false;
        this.inputEl.focus();
      }
    }

    showLoading() {
      this.responseEl.innerHTML =
        '<div class="advisor__loading">' +
          '<span></span><span></span><span></span>' +
        '</div>';
    }

    showResponse(question, answer) {
      let html = '';

      // Show conversation history for multi-turn
      if (this.multiTurn && this.history.length > 2) {
        // Show previous exchanges
        for (let i = 0; i < this.history.length - 2; i += 2) {
          html += '<div class="advisor__exchange advisor__exchange--prev">';
          html += '<p class="advisor__question">' + this.escapeHtml(this.history[i].content) + '</p>';
          html += '<div class="advisor__answer">' + this.formatResponse(this.history[i + 1].content) + '</div>';
          html += '</div>';
        }
      }

      // Current exchange
      html += '<div class="advisor__exchange">';
      html += '<p class="advisor__question">' + this.escapeHtml(question) + '</p>';
      html += '<div class="advisor__answer">' + this.formatResponse(answer) + '</div>';
      html += '</div>';

      // Clear/reset button
      html += '<button type="button" class="advisor__clear" data-action="advisor-clear">Ask another question</button>';

      this.responseEl.innerHTML = html;

      // Bind clear button
      const clearBtn = this.responseEl.querySelector('.advisor__clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.reset());
      }
    }

    showError(message) {
      this.responseEl.innerHTML =
        '<div class="advisor__error">' +
          '<p>' + this.escapeHtml(message || 'Something went wrong. Please try again or contact us directly.') + '</p>' +
          '<button type="button" class="advisor__clear">Try again</button>' +
        '</div>';

      const clearBtn = this.responseEl.querySelector('.advisor__clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.reset());
      }
    }

    reset() {
      if (!this.multiTurn) {
        this.history = [];
      }
      this.responseEl.style.display = 'none';
      this.responseEl.innerHTML = '';
      if (this.startersEl) {
        this.startersEl.style.display = '';
      }
      this.inputEl.focus();
    }

    formatResponse(text) {
      // Convert plain text to HTML paragraphs. Preserve line breaks.
      return text
        .split(/\n\n+/)
        .map(para => '<p>' + this.escapeHtml(para).replace(/\n/g, '<br>') + '</p>')
        .join('');
    }

    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    trackEvent(eventType, data) {
      // Use existing analytics tracker if available
      if (window.SSC && window.SSC.trackEvent) {
        window.SSC.trackEvent(eventType, data);
      }
    }
  }

  // ============================================
  // Initialize all advisors on page
  // ============================================
  function initAdvisors() {
    const containers = document.querySelectorAll('[data-advisor-type]');
    containers.forEach(container => {
      if (!container._advisor) {
        container._advisor = new Advisor(container);
      }
    });
  }

  // Export
  window.SSC = window.SSC || {};
  window.SSC.initAdvisors = initAdvisors;
  window.SSC.Advisor = Advisor;

})();
