interface ImportMeta {
    env: Env;
}

interface Env {
    PORT:                        number;
    IO_PORT:                     number;
    LOCAL_ADDRESS:               string;
    LOCAL_HOST:                  string;
    IPV4_ADDRESS:                string;
    IPV4_HOST:                   string;
    IO_HOST:                     string;
    GREETING:                    string;
    DEV:                         boolean;
    PROD:                        boolean;
    ROUTER_BASE_PATH:            string;
    ROUTER_HOME_PATH:            string;
    ROUTER_CONTENT_PATH:         string;
    ROUTER_CONTENT_COMMENT_PATH: string;
    ROUTER_COMMENT_PATH:         string;
    ROUTER_COMMENT_ID:           string;
    ROUTER_LOGIN_PATH:           string;
    ROUTER_LOGIN_ID:             string;
    ROUTER_NOT_FOUND_PATH:       string;
    STYLE_COLOR_DARK:            string;
    STYLE_COLOR_YELLOW:          string;
    STYLE_COLOR_BLUE:            string;
    STYLE_COLOR_WHITE:           string;
    STYLE_SCREEN_MOBILE:         string;
    STYLE_SCREEN_TABLET:         string;
    STYLE_SCREEN_LAPTOP:         string;
    STYLE_SCREEN_DESKTOP:        string;
    STYLE_MIXINS_LIQUID_GLASS:   string[];
}
