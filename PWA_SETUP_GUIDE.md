# PWA Setup Guide for Renovation Job Costing

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate Icons**
   ```bash
   node scripts/generate-icons.js
   ```

3. **Build the Application**
   ```bash
   npm run build
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

5. **Test PWA Features**
   ```bash
   node scripts/test-pwa.js
   ```

## Mobile Installation

### iOS (iPhone/iPad)
1. Open Safari and navigate to your app
2. Tap the Share button (square with arrow)
3. Select "Add to Home Screen"
4. Tap "Add" to install

### Android
1. Open Chrome and navigate to your app
2. Tap the menu button (three dots)
3. Select "Add to Home Screen"
4. Tap "Add" to install

## PWA Features Testing

### Offline Functionality
1. Open app while connected to internet
2. Disable network/Wi-Fi
3. Continue using the app
4. Re-enable connection to sync changes

### Location Services
1. Allow location permissions when prompted
2. Start a timer for a job
3. Verify location tracking is active
4. Check location history in time tracking

### Push Notifications
1. Allow notifications when prompted
2. Create/update jobs to trigger notifications
3. Test notification interactions

## Development Mode

### Local Development
```bash
npm run dev
```

Note: PWA features work best in production. Some features may be limited in development mode.

### Chrome DevTools Testing
1. Open DevTools (F12)
2. Go to Application tab
3. Test Service Worker, Cache, and IndexedDB
4. Use "Offline" checkbox to test offline mode
5. Test install prompt with "Add to Home Screen"

## Environment Variables

Create `.env.local` for production configuration:
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-key
NEXT_PUBLIC_GOOGLE_VERIFICATION=your-google-code
```

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Docker
```bash
# Build Docker image
docker build -t renovation-job-costing .

# Run container
docker run -p 3000:3000 renovation-job-costing
```

### Static Export
```bash
# Update next.config.ts for static export
npm run build
npm run export
```

## Troubleshooting

### Service Worker Issues
- Clear browser cache and storage
- Check console for service worker errors
- Verify HTTPS in production
- Update service worker version

### Icon Problems
- Regenerate icons: `node scripts/generate-icons.js`
- Check manifest.json paths
- Clear browser cache

### Sync Issues
- Check network connection
- Verify IndexedDB storage
- Review sync queue in DevTools
- Check API endpoints

### Performance Issues
- Run Lighthouse audit
- Check Core Web Vitals
- Optimize images and assets
- Review service worker caching

## Mobile Testing

### Required Devices
- iOS 14.3+ (Safari)
- Android 8+ (Chrome)
- Various screen sizes

### Test Scenarios
- Install from browser
- Offline functionality
- Network interruptions
- Background behavior
- Memory usage
- Battery consumption

## Security Considerations

### HTTPS Required
- PWA features require HTTPS in production
- Service workers need secure context
- Location services need secure context

### Data Protection
- IndexedDB data is local only
- Sync uses secure connections
- No sensitive data in service worker

## Browser Compatibility

### Fully Supported
- Chrome 88+
- Firefox 90+
- Safari 14+
- Edge 88+

### Limited Support
- Samsung Internet
- UC Browser
- Opera Mini

## Performance Optimization

### Caching Strategy
- API: Network-first (5 min)
- Static: Cache-first (30 days)
- Images: Stale-while-revalidate (24 hours)

### Bundle Size
- Code splitting enabled
- Lazy loading implemented
- Tree shaking configured
- Compressed assets

## Monitoring

### Analytics
- Track PWA installations
- Monitor offline usage
- Measure performance metrics
- User behavior analytics

### Error Tracking
- Service worker errors
- Sync failures
- Location service issues
- Network connectivity

## Future Enhancements

### Planned Features
- Background location tracking
- Advanced offline forms
- Real-time collaboration
- Push notification campaigns

### Performance
- Predictive caching
- WebAssembly integration
- WebRTC for real-time sync
- Edge computing support

## Support

For issues and questions:
1. Check the PWA Implementation Guide
2. Review browser console for errors
3. Test in different browsers/devices
4. Consult Progressive Web App documentation

---

This PWA implementation provides a complete mobile-first experience with offline capabilities, location tracking, and modern web standards compliance.