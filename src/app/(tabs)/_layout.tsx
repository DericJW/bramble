import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { TabButton, WoodTabBar } from '../../components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <WoodTabBar>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="iHome" label="Home" />
          </TabTrigger>
          <TabTrigger name="money" href="/money" asChild>
            <TabButton icon="iMoney" label="Money" />
          </TabTrigger>
          <TabTrigger name="miles" href="/miles" asChild>
            <TabButton icon="iMiles" label="Miles" />
          </TabTrigger>
          <TabTrigger name="expenses" href="/expenses" asChild>
            <TabButton icon="iExpenses" label="Expenses" />
          </TabTrigger>
          <TabTrigger name="liabilities" href="/liabilities" asChild>
            <TabButton icon="iLiabilities" label="Liabilities" />
          </TabTrigger>
        </WoodTabBar>
      </TabList>
    </Tabs>
  );
}
