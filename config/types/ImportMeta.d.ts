interface ImportMeta {
    env: Env;
}

interface Env {
    PORT:                                 number;
    IO_PORT:                              number;
    LOCAL_ADDRESS:                        string;
    LOCAL_HOST:                           string;
    IPV4_ADDRESS:                         string;
    IPV4_HOST:                            string;
    IO_HOST:                              string;
    GREETING:                             string;
    DEV:                                  boolean;
    PROD:                                 boolean;
    ROUTER_BASE_PATH:                     string;
    ROUTER_HOME_PATH:                     string;
    ROUTER_HOME_ID:                       string;
    ROUTER_POKEMON_PATH:                  string;
    ROUTER_POKEMON_GET_PATH_FUNCTION:     string;
    ROUTER_POKEMON_ID:                    string;
    ROUTER_CONTENT_PATH:                  string;
    ROUTER_CONTENT_COMMENT_PATH:          string;
    ROUTER_COMMENT_PATH:                  string;
    ROUTER_COMMENT_ID:                    string;
    ROUTER_LOGIN_PATH:                    string;
    ROUTER_LOGIN_ID:                      string;
    ROUTER_NOT_FOUND_PATH:                string;
    STYLE_COLOR_DARK:                     string;
    STYLE_COLOR_YELLOW:                   string;
    STYLE_COLOR_BLUE:                     string;
    STYLE_COLOR_WHITE:                    string;
    STYLE_SCREEN_MOBILE:                  string;
    STYLE_SCREEN_TABLET:                  string;
    STYLE_SCREEN_LAPTOP:                  string;
    STYLE_SCREEN_DESKTOP:                 string;
    STYLE_MIXINS_LIQUID_GLASS:            string[];
    API_PROXY_URL_GET_FUNCTION:           string;
    API_BASE_URL:                         string;
    API_PATH_GET_POKEMON_LIST_FUNCTION:   string;
    API_PATH_GET_POKEMON_DETAIL_FUNCTION: string;
    API_REDUCER_PATH_POKEMON:             string;
    API_ENDPOINT_GET_POKEMON_LIST:        string;
    API_ENDPOINT_GET_POKEMON_DETAIL:      string;
    INFO_POKEMON_STATS_DEFAULT:           InfoPokemonStatsDefault[];
    INFO_POKEMON_STATS_LEVEL:             InfoPokemonStatsLevel;
    INFO_POKEMON_STATS_COLOR:             InfoPokemonStatsColor;
    INFO_POKEMON_MAX_BASE_STATS:          number;
}

interface InfoPokemonStatsColor {
    bad:    string;
    normal: string;
    good:   string;
}

interface InfoPokemonStatsDefault {
    stat: Stat;
}

interface Stat {
    name: string;
}

interface InfoPokemonStatsLevel {
    bad:    number;
    normal: number;
    good:   number;
}
