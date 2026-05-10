import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { DocumentPage, Section, Para, Bullet } from './DocumentPage';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function PrivacyWhitepaperPage({ visible, onDismiss }: Props) {
  return (
    <DocumentPage
      visible={visible}
      onDismiss={onDismiss}
      title="Periphery Privacy Whitepaper"
    >
      <Text style={styles.versionLine}>
        Version 1.0 — to be published before public launch
      </Text>

      <Section isFirst header="What this document is">
        <Para>
          This is not a privacy policy in the conventional sense. Most privacy
          policies are written for legal protection first and reader comprehension
          second. They describe what a company could do with your data under broad
          legal cover, not what it actually does.
        </Para>
        <Para>
          This document is the inverse. It describes what Periphery actually does,
          what it doesn't do, and why. Where conventional privacy policies grant
          the company permission, this document is largely a list of permissions
          Periphery has decided not to take.
        </Para>
        <Para>
          If you want the short version: Periphery does not collect, transmit,
          store, or share information about you, your environment, or the devices
          it detects. Everything happens on your phone, stays on your phone, and
          disappears when you delete the app.
        </Para>
        <Para>
          The rest of this document explains why we can make that claim and what
          it means in practice.
        </Para>
      </Section>

      <Section header="What Periphery does">
        <Para>
          Periphery is a Bluetooth scanner. Your phone already has a Bluetooth
          radio, and that radio is constantly listening for nearby device broadcasts
          whether or not you have Periphery installed. When you open Periphery, the
          app uses the operating system's Bluetooth APIs to read those broadcasts
          and interpret them — identifying which broadcasts come from phones, which
          from earbuds, which from camera-equipped wearables, and so on.
        </Para>
        <Para>
          This information is then displayed on your phone's screen. That is the
          entire data flow.
        </Para>
      </Section>

      <Section header="What Periphery does not do">
        <Para>Periphery does not:</Para>
        <Bullet>
          Collect personal information about you (name, email, age, location
          history, contacts, or any identifier other than your phone's Bluetooth
          identifier, which is itself rotated by Android)
        </Bullet>
        <Bullet>
          Send data to any server, cloud service, third party, or affiliated entity
        </Bullet>
        <Bullet>
          Store records of detected devices beyond the rolling 10-minute window the
          app uses for its score history
        </Bullet>
        <Bullet>
          Maintain any account, login, or persistent user identity
        </Bullet>
        <Bullet>
          Share information with advertisers, analytics providers, or marketing
          partners
        </Bullet>
        <Bullet>
          Use location services for any purpose other than the map view's
          user-position display
        </Bullet>
        <Bullet>
          Record audio, capture images, or access camera, microphone, files,
          contacts, calendar, or any other data category beyond Bluetooth and
          approximate location
        </Bullet>
        <Para>
          These are not conditional disclosures — there is no "except when" clause
          attached. The architecture genuinely does not include the components that
          would enable these behaviors.
        </Para>
      </Section>

      <Section header="What information Periphery handles, and where it lives">
        <Para>
          Periphery processes three categories of information, all locally on your
          device:
        </Para>
        <Para>
          Bluetooth observation data. When the app's scanner detects a device
          broadcast, it reads the broadcast's manufacturer data, service
          identifiers, and signal strength. This data is held in your phone's
          memory while the app is running. Individual device observations expire
          from the active map shortly after their last detection, typically within
          60 seconds. A rolling history of aggregate scan results — used to display
          the score sparkline — is retained in memory for approximately 10 minutes
          and then discarded. Neither category of data is written to persistent
          storage, transmitted, or shared. When you close the app, all observation
          data is released.
        </Para>
        <Para>
          Location data. When the map view is active, Periphery requests your
          phone's GPS location to display your position on the map. This location
          data is used in real time to render the map view and is not stored,
          transmitted, or retained beyond the current session.
        </Para>
        <Para>
          Local app preferences. Settings such as your chosen detection radius,
          distance unit (feet or meters), and category filters are stored locally
          on your device using Android's standard app storage. These preferences
          exist only on your phone and are removed when you uninstall Periphery.
          They are never transmitted off the device.
        </Para>
        <Para>
          No other data is generated, accessed, or processed by the app.
        </Para>
      </Section>

      <Section header="Why these choices are architectural, not promissory">
        <Para>
          Many privacy policies say "we don't sell your data" or "we don't share
          your information with third parties." These are policies — promises the
          company makes that could change.
        </Para>
        <Para>
          Periphery's privacy properties are different in kind. The app does not
          include code to send observation data to a server because there is no
          server. The app does not include code to upload location to a backend
          because there is no backend. The app does not include analytics,
          telemetry, or crash reporting libraries that phone home with usage data.
        </Para>
        <Para>
          This is not because we promise to behave well. It is because the
          components required to behave badly do not exist in the application. You
          can verify this yourself when the source code is published — Periphery is
          open source under the AGPL-3.0 license, which means anyone can read,
          audit, fork, and republish the code.
        </Para>
        <Para>
          Future versions of Periphery may add features that involve transmitting
          data — for example, an opt-in shared density map or community-contributed
          wearable transmit-power database. If and when such features are added,
          they will:
        </Para>
        <Bullet>Require explicit, informed user opt-in</Bullet>
        <Bullet>
          Be accompanied by an updated version of this whitepaper describing
          exactly what is transmitted, what is retained, and for what purpose
        </Bullet>
        <Bullet>
          Be implemented in a way that is verifiable in the public source code
        </Bullet>
        <Para>The default state will always be "nothing leaves your device."</Para>
      </Section>

      <Section header="What Periphery cannot promise">
        <Para>
          Honesty requires acknowledging that some properties of Periphery's
          privacy posture depend on the broader Android ecosystem, not on Periphery
          alone.
        </Para>
        <Para>
          The Android operating system itself logs Bluetooth scanning activity at
          the system level. These logs are managed by Android, not Periphery, and
          are subject to Android's own privacy practices. Periphery does not
          contribute additional information to these logs.
        </Para>
        <Para>
          Your phone's manufacturer or carrier may have their own data collection
          practices that operate independently of any app you install. Periphery
          cannot prevent this and does not interact with it.
        </Para>
        <Para>
          Bluetooth signals are physical broadcasts. When your phone's Bluetooth
          identifier is detected by another device, that detection happens at the
          radio level and is not something any app can prevent. Modern phones
          rotate their Bluetooth identifiers frequently for privacy, but the
          broadcasts themselves are public information by their nature.
        </Para>
        <Para>
          If you grant Periphery the location permission required to scan for
          Bluetooth devices on Android, that permission grant is recorded by
          Android and visible in your system settings. This is a property of how
          Android handles permissions, not of Periphery's behavior.
        </Para>
        <Para>
          We mention these because honesty requires acknowledging the bounds of
          what an application can control. Periphery's architecture is private; the
          broader environment in which any phone operates is not entirely so.
        </Para>
      </Section>

      <Section header="Notifications">
        <Para>
          Periphery includes an optional notification feature that alerts you when
          a camera-equipped wearable is detected near you. These notifications are
          generated entirely on your device. The app does not contact any external
          service to fire the notification. If you have disabled notifications, no
          notification logic runs at all.
        </Para>
        <Para>
          The notification feature's permission can be revoked at any time through
          Periphery's settings or your Android system settings.
        </Para>
      </Section>

      <Section header="Children">
        <Para>
          Periphery is intended for adult users. The app does not knowingly collect
          information about anyone, including children. If you believe a minor is
          using Periphery and has been adversely affected in any way, please
          contact us using the address below.
        </Para>
      </Section>

      <Section header="Changes to this whitepaper">
        <Para>
          This document will be updated when Periphery's privacy posture changes —
          for example, if new features are added that involve any form of data
          transmission. Updates will be:
        </Para>
        <Bullet>Versioned (you can compare current and past versions)</Bullet>
        <Bullet>
          Announced in advance when they expand the scope of what Periphery does
          with data
        </Bullet>
        <Bullet>
          Accompanied by an in-app notice the next time the affected features are
          used
        </Bullet>
        <Para>
          The version number at the top of this document indicates which version is
          currently in effect.
        </Para>
      </Section>

      <Section header="Contact">
        <Para>
          Questions about this whitepaper or Periphery's privacy practices can be
          sent to peripheryapp@gmail.com.
        </Para>
      </Section>
    </DocumentPage>
  );
}

const styles = StyleSheet.create({
  versionLine: {
    color: '#6a7480',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
});
