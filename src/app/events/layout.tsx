'use client';
import React from 'react';
// React 19 호환 패치 — antd v5 의 unmountComponentAtNode/render 등 React 18 API 사용을 패치.
// 반드시 antd 컴포넌트보다 먼저 import 되어야 함.
import '@ant-design/v5-patch-for-react-19';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App, ConfigProvider } from 'antd';

// events 서브트리는 reference 의 cafe24Env 코드를 그대로 이식한 영역이라
// Ant Design + 한국어 + Pretendard 폰트로 격리해 사용한다.
// <App> 컴포넌트는 message/notification/Modal 의 useApp() 훅이 동작하도록 컨텍스트를 주입함.
export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          token: {
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif",
            colorPrimary: '#fe6326',
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
