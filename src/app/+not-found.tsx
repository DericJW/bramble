import { router } from 'expo-router';

import { PxButton } from '../ui/Buttons';
import { Frame } from '../ui/Frame';
import { SubScreen } from '../ui/Screen';
import { Txt } from '../ui/Txt';

export default function NotFound() {
  return (
    <SubScreen title="Lost in the meadow" onClose={() => router.replace('/')}>
      <Frame innerStyle={{ padding: 16, gap: 12 }}>
        <Txt lh={21}>This path doesn’t lead anywhere. Let’s head back to the farmhouse.</Txt>
        <PxButton label="Go home" onPress={() => router.replace('/')} />
      </Frame>
    </SubScreen>
  );
}
