import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

/// iOS 스톱워치 화면을 재현한 위젯.
///
/// - 랩: 진행 중인 스플릿을 목록에 기록한다
/// - 중단/시작: 스톱워치를 일시 정지하고 재개한다
/// - 완료된 랩 중 가장 짧은 랩은 초록, 가장 긴 랩은 빨강으로 표시한다
///
/// 사용: `MaterialApp(home: const StopwatchPage())`
class StopwatchPage extends StatefulWidget {
  const StopwatchPage({super.key});

  @override
  State<StopwatchPage> createState() => _StopwatchPageState();
}

class _StopwatchPageState extends State<StopwatchPage>
    with SingleTickerProviderStateMixin {
  final Stopwatch _stopwatch = Stopwatch();

  /// 완료된 랩만 담는다. 진행 중인 랩은 여기에 없다.
  final List<Duration> _laps = <Duration>[];

  late final Ticker _ticker;

  @override
  void initState() {
    super.initState();
    // Timer 대신 Ticker 를 쓴다. 프레임에 동기화돼 드리프트가 없고,
    // 화면이 보이지 않을 때 자동으로 멈춘다.
    _ticker = createTicker((_) => setState(() {}));
  }

  @override
  void dispose() {
    _ticker.dispose();
    _stopwatch.stop();
    super.dispose();
  }

  bool get _isRunning => _stopwatch.isRunning;

  /// 완료된 랩의 합 = 진행 중인 랩의 시작 지점.
  Duration get _completedTotal =>
      _laps.fold(Duration.zero, (Duration sum, Duration lap) => sum + lap);

  Duration get _currentLap => _stopwatch.elapsed - _completedTotal;

  /// 강조는 완료된 랩끼리만 비교한다. 2개 미만이면 비교 대상이 없다.
  Duration? get _shortestLap => _laps.length < 2
      ? null
      : _laps.reduce((Duration a, Duration b) => a < b ? a : b);

  Duration? get _longestLap => _laps.length < 2
      ? null
      : _laps.reduce((Duration a, Duration b) => a > b ? a : b);

  void _toggleRun() {
    setState(() {
      if (_isRunning) {
        _stopwatch.stop();
        _ticker.stop();
      } else {
        _stopwatch.start();
        _ticker.start();
      }
    });
  }

  void _lapOrReset() {
    setState(() {
      if (_isRunning) {
        _laps.add(_currentLap);
      } else {
        _stopwatch.reset();
        _laps.clear();
      }
    });
  }

  /// `mm:ss.cc` — 1시간을 넘기면 `h:mm:ss.cc`.
  static String _format(Duration d) {
    final int hours = d.inHours;
    final String minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final String seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    final String hundredths = (d.inMilliseconds.remainder(1000) ~/ 10)
        .toString()
        .padLeft(2, '0');
    return hours > 0
        ? '$hours:$minutes:$seconds.$hundredths'
        : '$minutes:$seconds.$hundredths';
  }

  @override
  Widget build(BuildContext context) {
    final bool canReset = !_isRunning && _stopwatch.elapsed > Duration.zero;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: <Widget>[
            const SizedBox(height: 72),
            Text(
              _format(_stopwatch.elapsed),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 76,
                fontWeight: FontWeight.w200,
                fontFeatures: <FontFeature>[FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 48),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: <Widget>[
                  _RoundButton(
                    label: _isRunning ? '랩' : '재설정',
                    background: const Color(0xFF333333),
                    foreground: Colors.white,
                    // 시작 전에는 기록할 랩도 되돌릴 상태도 없다.
                    onPressed: _isRunning || canReset ? _lapOrReset : null,
                  ),
                  _RoundButton(
                    label: _isRunning ? '중단' : '시작',
                    background: _isRunning
                        ? const Color(0xFF3A181C)
                        : const Color(0xFF15361F),
                    foreground: _isRunning
                        ? const Color(0xFFFF453A)
                        : const Color(0xFF30D158),
                    onPressed: _toggleRun,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            Expanded(child: _buildLapList()),
          ],
        ),
      ),
    );
  }

  Widget _buildLapList() {
    if (_laps.isEmpty) {
      return const SizedBox.shrink();
    }

    // 진행 중인 랩을 맨 위에, 완료된 랩은 최신순으로 그 아래에 쌓는다.
    final Duration? shortest = _shortestLap;
    final Duration? longest = _longestLap;
    // 완료된 랩이 전부 같은 시간이면 최단·최장을 가릴 의미가 없다.
    final bool highlight = shortest != longest;

    return ListView.separated(
      padding: EdgeInsets.zero,
      itemCount: _laps.length + 1,
      separatorBuilder: (BuildContext context, int index) => const Divider(
        height: 1,
        thickness: 0.5,
        indent: 20,
        endIndent: 20,
        color: Color(0xFF2C2C2E),
      ),
      itemBuilder: (BuildContext context, int index) {
        if (index == 0) {
          // 진행 중인 랩은 아직 확정되지 않았으므로 강조 대상이 아니다.
          return _LapRow(
            number: _laps.length + 1,
            time: _format(_currentLap),
            color: Colors.white,
          );
        }

        final int lapIndex = _laps.length - index;
        final Duration lap = _laps[lapIndex];
        final Color color;
        if (!highlight) {
          color = Colors.white;
        } else if (lap == longest) {
          color = const Color(0xFFFF453A);
        } else if (lap == shortest) {
          color = const Color(0xFF30D158);
        } else {
          color = Colors.white;
        }

        return _LapRow(number: lapIndex + 1, time: _format(lap), color: color);
      },
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.label,
    required this.background,
    required this.foreground,
    required this.onPressed,
  });

  final String label;
  final Color background;
  final Color foreground;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final bool enabled = onPressed != null;

    return Opacity(
      opacity: enabled ? 1 : 0.4,
      child: Material(
        color: background,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: 82,
            height: 82,
            child: Center(
              child: Text(
                label,
                style: TextStyle(color: foreground, fontSize: 17),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LapRow extends StatelessWidget {
  const _LapRow({
    required this.number,
    required this.time,
    required this.color,
  });

  final int number;
  final String time;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final TextStyle style = TextStyle(
      color: color,
      fontSize: 17,
      fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
    );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Text('랩 $number', style: style),
          Text(time, style: style),
        ],
      ),
    );
  }
}
