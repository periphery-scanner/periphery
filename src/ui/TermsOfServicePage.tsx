import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { DocumentPage, Section, Para, Bullet } from './DocumentPage';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function TermsOfServicePage({ visible, onDismiss }: Props) {
  return (
    <DocumentPage
      visible={visible}
      onDismiss={onDismiss}
      title="Periphery Terms of Service"
    >
      <Text style={styles.versionLine}>
        Version 1.0 — to be published before public launch
      </Text>
      <Text style={styles.todoNote}>
        [TODO before public launch: replace "Periphery" entity references with
        the formal legal entity name once established. Confirm New York
        jurisdiction is correct for the entity's eventual incorporation state.]
      </Text>

      <Section isFirst header="What this document is">
        <Para>
          These are the terms you agree to when you use Periphery. They're
          written to be readable by a real person, not just lawyers — but
          they're still a legal agreement. By installing or using the Periphery
          application, you accept these terms.
        </Para>
        <Para>
          If anything below is unclear or seems wrong, please contact us at
          peripheryapp@gmail.com before continuing to use the app.
        </Para>
      </Section>

      <Section header="Who you're agreeing with">
        <Para>
          You're agreeing with Periphery, the developer of the Periphery
          application. Periphery is currently operated as an individual
          developer entity based in New York, United States.
        </Para>
        <Para>
          References to "we," "us," and "our" in this document mean Periphery.
          References to "you" and "your" mean the person installing or using
          the app.
        </Para>
      </Section>

      <Section header="What Periphery does, in legal terms">
        <Para>
          Periphery is software that uses your phone's Bluetooth radio to
          detect public Bluetooth Low Energy broadcasts from nearby devices and
          displays interpreted information about those broadcasts. The app
          classifies detected devices into categories (such as phones, earbuds,
          smart speakers, and camera-equipped wearables), estimates approximate
          distance from your phone, and displays this information on a map view
          in real time.
        </Para>
        <Para>
          The app does not record audio, capture images, decrypt private
          communication, or access the contents of any device. It reads only
          what nearby devices are publicly broadcasting via Bluetooth.
        </Para>
      </Section>

      <Section header="What you agree to">
        <Para>By using Periphery, you agree to the following:</Para>
        <Para>
          You will use Periphery for lawful purposes. You will not use the app
          to harass, stalk, or surveil any specific person. You will not use
          the app's detection capabilities as part of any conduct that would be
          illegal if conducted with any other detection tool.
        </Para>
        <Para>
          You understand that Periphery is informational. The app surfaces
          Bluetooth broadcast data and categorizes it based on signal patterns.
          It cannot guarantee that any classification is correct, that any
          device is or is not actively recording, or that any specific person
          is or is not present. Periphery provides information; you decide what
          to do with it.
        </Para>
        <Para>
          You are responsible for your own decisions. If you take action based
          on what Periphery shows you — confronting someone, leaving a space,
          reporting a device, or any other decision — that action is your own.
          Periphery is a tool for awareness, not a basis for accusation.
        </Para>
        <Para>
          You will not attempt to compromise the app or its users. You will not
          reverse-engineer the app for malicious purposes, attempt to exploit
          security vulnerabilities, or modify the app to spread harmful
          behavior. (Note: you are explicitly permitted to inspect, modify, and
          redistribute the source code under the AGPL-3.0 license described
          below; this provision restricts only malicious activity.)
        </Para>
      </Section>

      <Section header="What we promise">
        <Para>
          We will not use Periphery to spy on you. As described in our Privacy
          Whitepaper, Periphery does not collect, transmit, store, or share
          information about you, your environment, or the devices it detects.
          The app's privacy properties are architectural — the components
          required to behave otherwise do not exist in the application.
        </Para>
        <Para>
          We will tell you when things change. If a future version of Periphery
          changes what it does with data, we will update the Privacy Whitepaper
          and notify you in-app before the change takes effect.
        </Para>
        <Para>
          We will be honest about what the app can and cannot do. Periphery's
          classification is probabilistic, not certain. Its distance estimates
          are approximate. Its bearings on the map are illustrative, not
          measured. Where the app's capabilities are limited, we say so — both
          in the app and in our published documentation.
        </Para>
      </Section>

      <Section header="What we don't promise">
        <Para>
          We don't guarantee accurate detection. Bluetooth signals can be
          missed, misclassified, or misattributed. Devices can rotate
          identifiers and be counted twice. Walls, bodies, and electromagnetic
          noise affect signal strength in ways that no software can fully
          compensate for. The app does its honest best with imperfect
          information.
        </Para>
        <Para>
          We don't guarantee uninterrupted service. The app may have bugs,
          crashes, or moments where it doesn't function as expected. We will
          work to fix issues we know about, but we cannot guarantee the app
          will work in every environment, on every Android version, or under
          every condition.
        </Para>
        <Para>
          We don't guarantee fitness for any specific purpose. Periphery is not
          certified for security applications, legal evidence-gathering,
          professional surveillance detection, or any other regulated use. It
          is consumer software for personal awareness.
        </Para>
        <Para>
          We make no warranty of any kind. The app is provided "as is" without
          warranty of merchantability, fitness for a particular purpose, or
          non-infringement. Some jurisdictions do not allow the exclusion of
          certain warranties, so some of these exclusions may not apply to you.
        </Para>
      </Section>

      <Section header="Limitation of liability">
        <Para>
          To the fullest extent permitted by law, Periphery is not liable for
          any indirect, incidental, consequential, or special damages arising
          from your use of the app — including but not limited to damages for
          lost data, lost time, emotional distress, or decisions made based on
          the app's output.
        </Para>
        <Para>
          If you take action based on what Periphery shows you, that action is
          your own. Periphery cannot be held responsible for confrontations,
          conflicts, or consequences arising from how you choose to respond to
          information the app surfaces.
        </Para>
        <Para>
          In jurisdictions where this kind of liability cannot be fully
          disclaimed, our liability is limited to the amount you paid to
          acquire the application.
        </Para>
      </Section>

      <Section header="The app is open source">
        <Para>
          Periphery is published under the GNU Affero General Public License
          version 3 (AGPL-3.0). This means:
        </Para>
        <Bullet>You have the right to inspect the app's source code</Bullet>
        <Bullet>
          You have the right to modify and redistribute the code, subject to
          AGPL-3.0's terms
        </Bullet>
        <Bullet>
          If you run a modified version of Periphery as a network service, you
          must make your modifications available under the same license
        </Bullet>
        <Para>
          The AGPL-3.0 license governs the code itself. These Terms of Service
          govern your use of the official Periphery application. Where the two
          might appear to conflict, the AGPL-3.0 license controls for matters
          relating to source code rights, and these Terms control for matters
          relating to your use of the application.
        </Para>
        <Para>
          The full text of the AGPL-3.0 license is included with the app's
          source code repository.
        </Para>
      </Section>

      <Section header="Termination">
        <Para>
          You can stop using Periphery at any time by uninstalling the app.
          When you uninstall, all locally stored preferences and any cached
          observation data are removed from your device.
        </Para>
        <Para>
          We may discontinue distribution of the app at any time. If we do,
          you may continue using your installed version, and the AGPL-3.0
          license guarantees your right to maintain and modify the source code
          on your own.
        </Para>
      </Section>

      <Section header="Changes to these terms">
        <Para>
          We may update these terms when the app's behavior changes
          substantively. When we do, we will:
        </Para>
        <Bullet>Update the version number at the top of this document</Bullet>
        <Bullet>Make the new version available through the app</Bullet>
        <Bullet>
          Notify you in-app the next time you use the app after the change
        </Bullet>
        <Para>
          Your continued use of Periphery after changes are published
          constitutes acceptance of the updated terms. If you don't accept
          changes, you can uninstall the app at any time.
        </Para>
      </Section>

      <Section header="Governing law">
        <Para>
          These terms are governed by the laws of the State of New York, United
          States, without regard to its conflict-of-law provisions. Any dispute
          arising from your use of the app will be resolved in the state or
          federal courts located in New York, New York.
        </Para>
      </Section>

      <Section header="Contact">
        <Para>
          If you have questions about these terms, please contact us at
          peripheryapp@gmail.com.
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
  todoNote: {
    color: '#6a7480',
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
    lineHeight: 16,
  },
});
