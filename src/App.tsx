/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatInterface } from "./components/ChatInterface";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
    <>
      <ChatInterface />
      <Toaster position="top-center" theme="dark" />
    </>
  );
}
