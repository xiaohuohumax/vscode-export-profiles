interface UseDefaultFlags {
  settings: boolean
  keybindings: boolean
  snippets: boolean
  tasks: boolean
  extensions: boolean
}

interface UserDataProfile {
  location: string
  name: string
  icon?: string
  useDefaultFlags?: UseDefaultFlags
}

interface Storage {
  userDataProfiles: UserDataProfile[]
}