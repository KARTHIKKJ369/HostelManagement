const express = require('express');
const router = express.Router();
const { authenticateToken, isWarden } = require('../middleware/auth');
const SettingsService = require('../services/SettingsService');

// Default rules HTML (keeps current dummy rules content if DB not set)
const DEFAULT_RULES_HTML = `
    <div style="padding: 0.5rem;">
        <h5 style="color: #e67e22; margin-bottom: 0.5rem;">🕘 Timing Rules:</h5>
        <ul style="margin-left: 1.2rem; color: #2c3e50; line-height: 1.5;">
            <li>Curfew time is 9:00 PM for all students.</li>
            <li>Quiet hours: 10:00 PM to 6:00 AM.</li>
            <li>Late return permissions must be pre-approved by the warden.</li>
        </ul>
        <h5 style="color: #e67e22; margin: 1rem 0 0.5rem;">🧹 Cleanliness & Maintenance:</h5>
        <ul style="margin-left: 1.2rem; color: #2c3e50; line-height: 1.5;">
            <li>Keep rooms and common areas clean.</li>
            <li>Report maintenance issues using the app.</li>
            <li>No cooking inside rooms.</li>
        </ul>
        <h5 style="color: #e67e22; margin: 1rem 0 0.5rem;">🔇 Discipline & Conduct:</h5>
        <ul style="margin-left: 1.2rem; color: #2c3e50; line-height: 1.5;">
            <li>Be respectful to staff and fellow students.</li>
            <li>No smoking, alcohol, or prohibited substances.</li>
            <li>Visitors are allowed only during designated hours.</li>
        </ul>
    </div>`;

// GET /api/rules - Get global hostel rules HTML
router.get('/', async (req, res) => {
  try {
    const settings = await SettingsService.getSettings();
    const rules = settings?.rules?.html || DEFAULT_RULES_HTML;
    const updatedAt = settings?.rules?.updated_at || null;
    res.json({ success: true, data: { html: rules, updated_at: updatedAt } });
  } catch (e) {
    console.error('rules GET error:', e.message);
    // Best-effort fallback
    res.json({ success: true, data: { html: DEFAULT_RULES_HTML } });
  }
});

// POST /api/warden/rules - Update global hostel rules HTML
router.post('/warden', authenticateToken, isWarden, async (req, res) => {
  try {
    const { html } = req.body || {};
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid rules payload. Expect { html: string }' });
    }
    const next = await SettingsService.updateSettings({ rules: { html, updated_at: new Date().toISOString(), updated_by: req.user.userId } });
    res.json({ success: true, message: 'Rules updated', data: { html: next.rules.html, updated_at: next.rules.updated_at } });
  } catch (e) {
    console.error('rules POST error:', e.message);
    const status = e.status || 500;
    res.status(status).json({ success: false, message: e.message || 'Failed to update rules' });
  }
});

module.exports = router;
