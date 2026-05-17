"C:\Rohith\SDK\android_studio\build-tools\36.1.0\apksigner.bat" sign --ks my-release-key.jks --ks-key-alias my-key-alias --out app-release-signed.apk app-release-unsigned.apk

cd app/build/outputs/apk/release/ && "C:\Rohith\SDK\android_studio\build-tools\36.1.0\apksigner.bat" sign --ks my-release-key.jks --ks-key-alias my-key-alias --out app-release-signed.apk app-release-unsigned.apk

.\gradlew assembleRelease -Dorg.gradle.java.home="C:\Rohith\SDK\jdk-17.0.12"
.\gradlew installDebug -Dorg.gradle.java.home="C:\Rohith\SDK\jdk-17.0.12" 
.\gradlew assembleDebug -Dorg.gradle.java.home="C:\Rohith\SDK\jdk-17.0.12"
