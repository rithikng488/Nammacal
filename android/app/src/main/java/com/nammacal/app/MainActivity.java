package com.nammacal.app;

import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NammaCalHealthConnectPlugin.class);
        super.onCreate(savedInstanceState);

        // Official Android 14+ (API 34+) screenshot detection callback
        // PRIVACY INVARIANT:
        // - Only receives event notification that user took a screenshot.
        // - NEVER accesses screen pixels, bitmap, or media projection.
        // - NEVER scans the user gallery or device storage.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                registerScreenCaptureCallback(getMainExecutor(), () -> {
                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.triggerWindowJSEvent("nammacalScreenshotDetected");
                    }
                });
            } catch (Exception e) {
                // Graceful fallback if unsupported
            }
        }
    }
}
