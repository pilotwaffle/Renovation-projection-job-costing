import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

// Builds 1.2 (5) and (6) were built by Codemagic with Xcode 27.2 / iOS 27 SDK and
// crashed at launch in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption:
// apps built with the iOS 27 SDK must adopt the UIScene life cycle (Apple TN3187).
// Build 1.2 (4) (Xcode 26) launched fine. These checks keep the migration in place.
const root = path.resolve(__dirname, '..')
const read = (p: string) => readFileSync(path.join(root, p), 'utf8')

const infoPlist = read('ios/App/App/Info.plist')
const appDelegate = read('ios/App/App/AppDelegate.swift')
const sceneDelegate = read('ios/App/App/SceneDelegate.swift')
const pbxproj = read('ios/App/App.xcodeproj/project.pbxproj')
const pkg = JSON.parse(read('package.json'))
const spm = read('ios/App/CapApp-SPM/Package.swift')

const minor = (range: string) => {
  const m = range.match(/(\d+)\.(\d+)/)
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

describe('iOS UIScene life cycle (required by the iOS 27 SDK)', () => {
  it('declares a single-scene manifest pointing at SceneDelegate', () => {
    expect(infoPlist).toContain('<key>UIApplicationSceneManifest</key>')
    expect(infoPlist).toContain('<key>UIWindowSceneSessionRoleApplication</key>')
    expect(infoPlist).toContain('<string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>')
    expect(infoPlist).toMatch(/<key>UIApplicationSupportsMultipleScenes<\/key>\s*<false\/>/)
  })

  it('AppDelegate returns a scene configuration using SceneDelegate', () => {
    expect(appDelegate).toContain('configurationForConnecting connectingSceneSession: UISceneSession')
    expect(appDelegate).toContain('config.delegateClass = SceneDelegate.self')
  })

  it('SceneDelegate builds the window with the Capacitor bridge and forwards to SceneDelegateProxy', () => {
    expect(sceneDelegate).toContain('class SceneDelegate: UIResponder, UIWindowSceneDelegate')
    expect(sceneDelegate).toContain('UIWindow(windowScene: windowScene)')
    expect(sceneDelegate).toContain('CAPBridgeViewController()')
    expect(sceneDelegate).toContain('SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)')
    expect(sceneDelegate).toContain('SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)')
    expect(sceneDelegate).toContain('SceneDelegateProxy.shared.scene(scene, continue: userActivity)')
  })

  it('compiles SceneDelegate.swift into the App target', () => {
    expect(pbxproj).toMatch(/\/\* SceneDelegate\.swift \*\/ = \{isa = PBXFileReference;[^}]*path = SceneDelegate\.swift;/)
    expect(pbxproj).toMatch(/\/\* SceneDelegate\.swift in Sources \*\/ = \{isa = PBXBuildFile;/)
    // listed in the Sources build phase (and the App group)
    expect(pbxproj.match(/\/\* SceneDelegate\.swift in Sources \*\/,/g)).toHaveLength(1)
    expect(pbxproj.match(/\t\t\t\t[0-9A-F]{24} \/\* SceneDelegate\.swift \*\/,/g)).toHaveLength(1)
  })

  it('uses Capacitor >= 8.5 (ships SceneDelegateProxy) in npm and SPM', () => {
    for (const name of ['@capacitor/core', '@capacitor/ios']) {
      const [maj, min] = minor(pkg.dependencies[name])
      expect(maj === 8 ? min >= 5 : maj > 8).toBe(true)
    }
    const [maj, min] = minor(pkg.devDependencies['@capacitor/cli'] ?? pkg.dependencies['@capacitor/cli'])
    expect(maj === 8 ? min >= 5 : maj > 8).toBe(true)
    const m = spm.match(/capacitor-swift-pm\.git", exact: "(\d+)\.(\d+)\.\d+"/)
    expect(m).not.toBeNull()
    expect(Number(m![1]) === 8 ? Number(m![2]) >= 5 : Number(m![1]) > 8).toBe(true)
  })
})
