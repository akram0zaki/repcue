import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var scrollConfigTimer: Timer?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        
        // Configure WKWebView scrolling repeatedly until content is loaded
        // Start after a brief delay to ensure webView exists
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.startScrollConfiguration()
        }
        
        return true
    }
    
    /// Starts periodic scroll configuration until content is loaded
    private func startScrollConfiguration() {
        // Try immediately
        configureWebViewScrolling()
        
        // Then retry every 0.5 seconds until content size is non-zero
        scrollConfigTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] timer in
            guard let self = self else {
                timer.invalidate()
                return
            }
            
            if let rootViewController = self.window?.rootViewController as? CAPBridgeViewController,
               let webView = rootViewController.webView {
                let contentSize = webView.scrollView.contentSize
                
                // Once content is loaded (non-zero size), configure and stop
                if contentSize.height > 0 {
                    self.configureWebViewScrolling()
                    print("[RepCue] Content loaded, final scroll config applied. contentSize=\(contentSize)")
                    timer.invalidate()
                    self.scrollConfigTimer = nil
                }
            }
        }
        
        // Safety: stop trying after 10 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 10.0) { [weak self] in
            self?.scrollConfigTimer?.invalidate()
            self?.scrollConfigTimer = nil
        }
    }
    
    /// Configures the WKWebView scroll view to ensure scrolling works properly
    private func configureWebViewScrolling() {
        guard let rootViewController = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootViewController.webView else {
            print("[RepCue] Could not access webView for scroll configuration")
            return
        }
        
        // Enable scrolling - explicit settings for iOS 26
        let scrollView = webView.scrollView
        scrollView.isScrollEnabled = true
        scrollView.bounces = true
        scrollView.alwaysBounceVertical = true
        scrollView.alwaysBounceHorizontal = false
        scrollView.showsVerticalScrollIndicator = true
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.contentInsetAdjustmentBehavior = .automatic
        scrollView.decelerationRate = .normal
        
        // Ensure scroll view is not blocked by gesture recognizers
        scrollView.panGestureRecognizer.isEnabled = true
        scrollView.isUserInteractionEnabled = true
        webView.isUserInteractionEnabled = true
        
        // Configure for inline video playback
        // Note: allowsInlineMediaPlayback is set via WKWebViewConfiguration during init
        // by Capacitor, but we can verify/configure media-related scroll behavior here
        
        // Log scroll view state for debugging
        print("[RepCue] WebView scroll configured: isScrollEnabled=\(scrollView.isScrollEnabled), bounces=\(scrollView.bounces), contentSize=\(scrollView.contentSize)")
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
