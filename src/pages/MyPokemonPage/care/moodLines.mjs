// One line per personality (traits.mjs PERSONALITIES, by index) and mood,
// said in that personality's voice. Each stays under 40 characters so it
// fits the speech bubble at 320px.

const ORDER = ['angry', 'ignoring', 'hungry', 'sad', 'happy', 'glad']

const LINES = [
  // Hiền
  [
    'Mình hơi buồn lòng đấy…',
    'Bạn quên mình rồi sao?',
    'Bụng mình kêu nhỏ nhỏ…',
    'Chơi với mình chút nhé?',
    'Ngon quá, cảm ơn bạn nhiều!',
    'Hôm nay thật dễ chịu.',
  ],
  // Nghịch
  [
    'Hứ! Không chơi nữa!',
    'Đi đâu mất tiêu vậy hả?',
    'Đói! Đói! Đói quá trời!',
    'Chán ơi là chán…',
    'Món này đỉnh của chóp!',
    'Quậy tiếp thôi nào!',
  ],
  // Điềm tĩnh
  [
    'Mình cần yên tĩnh một lúc.',
    'Lâu rồi không gặp nhỉ.',
    'Có lẽ đến giờ ăn rồi.',
    'Hơi trống trải một chút.',
    'Thật trọn vẹn.',
    'Mọi thứ vẫn ổn.',
  ],
  // Tò mò
  [
    'Sao lại làm thế với mình?',
    'Bạn đã đi khám phá đâu thế?',
    'Món gì sắp tới vậy ta?',
    'Chẳng có gì mới để xem…',
    'Vị này lạ mà mê quá!',
    'Ơ, cái gì kia?',
  ],
  // Dũng cảm
  [
    'Đừng có thử thách ta!',
    'Chiến binh bị bỏ quên…',
    'Không ăn sao mà chiến!',
    'Ta cần một trận vui.',
    'Sức mạnh dâng trào!',
    'Sẵn sàng mọi thử thách!',
  ],
  // Nhút nhát
  [
    'M-mình không thích vậy…',
    '…bạn còn nhớ mình không?',
    'Mình… hơi đói ạ.',
    'Mình ngồi một mình hoài…',
    'Hì… mình vui lắm.',
    'Ở cạnh bạn thấy yên tâm.',
  ],
  // Lười
  [
    'Phiền quá đi…',
    'Ngủ tiếp vậy…',
    'Đói… mà lười đi kiếm…',
    'Chẳng muốn làm gì…',
    'Ăn no rồi, ngủ thôi~',
    'Nằm thế này là đẹp.',
  ],
  // Siêng
  [
    'Làm vậy là không được!',
    'Mình vẫn chờ bạn mỗi ngày.',
    'Nạp năng lượng thôi!',
    'Không có việc gì làm cả…',
    'Năng lượng tràn trề!',
    'Hôm nay làm thêm chút nữa!',
  ],
  // Kiêu hãnh
  [
    'Ngươi dám sao?',
    'Ta chẳng thèm để ý ngươi.',
    'Ta không đòi… nhưng bụng thì có.',
    'Ta… không buồn đâu.',
    'Xứng tầm với ta đấy.',
    'Ta vẫn rạng rỡ như thường.',
  ],
  // Tinh nghịch
  [
    'Hết vui rồi nha!',
    'Trốn tìm lâu thế ai chơi!',
    'Cho ăn đi rồi diễn trò!',
    'Không ai chơi cùng hết…',
    'Hí hí, ngon dã man!',
    'Bày trò gì tiếp đây?',
  ],
  // Mơ mộng
  [
    'Giấc mơ vỡ tan rồi…',
    'Mình mơ thấy bạn đã đi xa…',
    'Mơ thấy bánh ngọt…',
    'Mây hôm nay xám quá.',
    'Như được bay trên mây!',
    'Hôm nay trời đẹp ghê.',
  ],
  // Cẩn thận
  [
    'Mình đã nói là không mà.',
    'Mình đếm từng ngày đấy.',
    'Đã quá giờ ăn rồi.',
    'Hơi thiếu vận động rồi.',
    'Món này chuẩn từng chút!',
    'Mọi thứ đúng kế hoạch.',
  ],
]

export const moodLine = (personality, mood) =>
  LINES[personality]?.[ORDER.indexOf(mood)] ?? ''
