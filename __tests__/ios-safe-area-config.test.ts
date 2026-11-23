import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import config from '../capacitor.config'

const pbxproj = readFileSync(
  path.resolve(__dirname, '../ios/App/App.xcodeproj/project.pbxproj'),
  'utf8'
)

describe('iOS shell safe-area config (build 1.2 (4))', () => {
  it('does not let UIKit add its own scroll inset (contentInset never)', () => {
    expect(config.ios?.contentInset).toBe('never')
  })

  it('lays the web view out below the status bar on a solid white strip with dark text', () => {
    expect(config.plugins?.StatusBar).toEqual({
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    })
  })

  it('keeps loading production and the existing splash', () => {
    expect(config.server?.url).toBe('https://renovation-projection-job-costing.vercel.app')
    expect(config.plugins?.SplashScreen?.backgroundColor).toBe('#0f172a')
  })

  it('bumps the build to 4 and keeps marketing version 1.2 in Debug and Release', () => {
    expect(pbxproj.match(/CURRENT_PROJECT_VERSION = 4;/g)).toHaveLength(2)
    expect(pbxproj).not.toMatch(/CURRENT_PROJECT_VERSION = (?!4;)/)
    expect(pbxproj.match(/MARKETING_VERSION = 1\.2;/g)).toHaveLength(2)
    expect(pbxproj).not.toMatch(/MARKETING_VERSION = (?!1\.2;)/)
  })

  it('ships the StatusBar plugin in the SPM package', () => {
    const pkg = readFileSync(path.resolve(__dirname, '../ios/App/CapApp-SPM/Package.swift'), 'utf8')
    expect(pkg).toContain('name: "CapacitorStatusBar"')
    expect(pkg).toContain('.product(name: "CapacitorStatusBar", package: "CapacitorStatusBar")')
  })
})
