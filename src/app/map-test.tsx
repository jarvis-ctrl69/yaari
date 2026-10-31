import { View } from "react-native";
import { WebView } from "react-native-webview";

export default function MapTestScreen() {
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{
          html: `
            <!DOCTYPE html>
            <html>
              <body style="margin:0; padding:0;">
                <div style="
                  height:100vh;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-family:Arial;
                  font-size:24px;
                ">
                  WebView is working ✅
                </div>
              </body>
            </html>
          `,
        }}
        style={{ flex: 1 }}
      />
    </View>
  );
}