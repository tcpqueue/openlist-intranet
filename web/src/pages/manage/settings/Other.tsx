import { Button, HStack, Input, VStack } from "@hope-ui/solid"
import { createSignal, onMount } from "solid-js"
import { Resp, SettingItem } from "~/types"
import { handleResp, r } from "~/utils"
export default function OtherSettings() {
  const [token, setToken] = createSignal("")
  onMount(async () => {
    const response = (await r.get(
      "/admin/setting/get?key=token",
    )) as unknown as Resp<SettingItem>
    handleResp(response, (data: any) => setToken(data.value))
  })
  return (
    <VStack alignItems="start">
      <Input value={token()} readOnly />
      <HStack>
        <Button
          onClick={async () => {
            const response = (await r.post(
              "/admin/setting/reset_token",
            )) as unknown as Resp<string>
            handleResp(response, (data: string) => setToken(data))
          }}
        >
          重置访问令牌
        </Button>
      </HStack>
    </VStack>
  )
}
