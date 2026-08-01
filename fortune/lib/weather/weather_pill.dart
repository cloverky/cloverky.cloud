import 'package:flutter/material.dart';

import '../theme.dart';
import 'location_service.dart';
import 'weather_api.dart';

/// 탭하면 현재 위치의 날씨로 바꾼다. 실패하면 기본값이 그대로 남는다.
class WeatherPill extends StatefulWidget {
  const WeatherPill({super.key, required this.api, required this.location});

  final WeatherApi api;
  final LocationService location;

  @override
  State<WeatherPill> createState() => _WeatherPillState();
}

class _WeatherPillState extends State<WeatherPill> {
  static const WeatherReading _fallback = WeatherReading(
    city: '서울',
    tempC: 18,
    description: '맑음',
  );

  WeatherReading _reading = _fallback;
  bool _loading = false;

  Future<void> _useMyLocation() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final coords = await widget.location.current();
      // 위치를 못 얻으면 요청 자체를 하지 않는다 — 기본값이 남는다.
      if (coords == null) return;
      final reading = await widget.api.fetch(coords: coords);
      if (!mounted) return;
      setState(() => _reading = reading);
    } catch (error) {
      debugPrint('Weather lookup failed, keeping the default: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final temp = _reading.tempC.round();
    return GestureDetector(
      // 알약 전체가 눌리게 한다. 기본값은 자식에게 위임이라 여백에서 탭을 놓친다.
      behavior: HitTestBehavior.opaque,
      onTap: _useMyLocation,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wb_sunny_outlined, size: 16, color: kMutedFg),
            const SizedBox(width: 6),
            Text(
              '$temp°  ${_reading.description} · ${_reading.city}',
              style: const TextStyle(
                fontSize: 13,
                color: kFg,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
